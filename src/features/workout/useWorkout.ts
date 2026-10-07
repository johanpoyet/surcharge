import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { db, liveDb } from '@/db/client';
import { sessions, type Exercise, type JsonObject, type SessionSet } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { parseBlockConfig } from '@/features/templates/blockConfig';
import { fr } from '@/i18n/fr';
import { requestSync } from '@/sync';
import {
  activeSeconds,
  canUndo,
  hyroxResult,
  hyroxTap,
  newRun,
  pauseRun,
  resumeRun,
  signalTimes,
  startHyrox,
  undoHyroxTap,
  type BlockRun,
} from './blocks/engine';
import { plannedSets, prefillSet, type PreviousSet, type SetDraft } from './logic';
import {
  addSet,
  deleteSet,
  deleteSetAndRenumber,
  endWorkout,
  getWorkoutState,
  lastSessionSets,
  listSessionSets,
  saveWorkoutState,
  sessionSetsQuery,
  updateSessionBlock,
  updateSet,
} from './repository';
import { endRestActivities, startRestActivity } from './restActivity';
import {
  cancelRestNotification,
  cancelSignals,
  scheduleRestEnd,
  scheduleSignals,
} from './restNotifications';
import { restoreWorkoutState } from './start';
import {
  blockOf,
  blocksOf,
  draftKey,
  type PlannedBlock,
  type WorkoutPlanItem,
  type WorkoutUiState,
} from './state';

export type ExerciseProgress = {
  order: number;
  item: WorkoutPlanItem;
  exercise: Exercise | undefined;
  done: SessionSet[];
  planned: number;
  /** Numéro de la prochaine série à faire, null si l'exercice est terminé. */
  activeSetNumber: number | null;
  previous: PreviousSet[];
};

/** Mesures d'une série d'un bloc cardio (chrono tap / tap) ou sans charge. */
export type MeasuredSet = {
  weightKg?: number;
  reps?: number;
  distanceM?: number | null;
  durationS?: number | null;
  calories?: number | null;
};

const omit = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

const iso = (ms: number) => new Date(ms).toISOString();
const t = fr.workout.blocks;

/** Blocs dont les lignes du plan ont des séries à faire une à une (V1 et cardio). */
const hasSetRows = (block: PlannedBlock | undefined) =>
  !block || block.type === 'strength' || block.type === 'cardio';

/** État et actions de l'écran de séance en cours (SPEC 8.2, SPEC_V2 §5.3). */
export function useWorkout(sessionId: string) {
  const userId = useAuth().session?.user.id ?? '';
  const [state, setState] = useState<WorkoutUiState | undefined>(
    () => getWorkoutState(db, sessionId) ?? restoreWorkoutState(db, sessionId),
  );
  // L'état est persisté à chaque changement : la séance survit à la fermeture de l'app.
  useEffect(() => {
    if (state) saveWorkoutState(db, sessionId, state);
  }, [sessionId, state]);
  // App relancée sans repos en cours : retire un chrono resté affiché (app fermée pendant le repos).
  useEffect(() => {
    if (!getWorkoutState(db, sessionId)?.rest) endRestActivities();
  }, [sessionId]);

  const { data: sessionRows } = useLiveQuery(
    liveDb.select().from(sessions).where(eq(sessions.id, sessionId)),
    [sessionId],
  );
  const session = sessionRows[0];
  const { data: sets } = useLiveQuery(sessionSetsQuery(liveDb, sessionId), [sessionId]);
  const exercises = useExercises();
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  const planIds = state?.plan.map((p) => p.exerciseId).join(',') ?? '';
  const previousByExercise = useMemo(
    () => lastSessionSets(db, userId, planIds ? planIds.split(',') : [], sessionId),
    [planIds, sessionId, userId],
  );

  const blocks = useMemo(() => (state ? blocksOf(state) : []), [state]);
  const currentBlock = state?.currentBlock ?? 0;

  const progress: ExerciseProgress[] = useMemo(
    () =>
      (state?.plan ?? []).map((item, order) => {
        const done = sets.filter((s) => s.exerciseOrder === order);
        const planned = plannedSets(item.targetSets, state?.extraSets[order] ?? 0, done.length);
        return {
          order,
          item,
          exercise: exerciseById.get(item.exerciseId),
          done,
          planned,
          activeSetNumber: done.length < planned ? done.length + 1 : null,
          previous: previousByExercise.get(item.exerciseId) ?? [],
        };
      }),
    [exerciseById, previousByExercise, sets, state?.extraSets, state?.plan],
  );

  /** Lignes du plan d'un bloc, dans l'ordre. */
  const itemsOf = useCallback(
    (blockIndex: number) => progress.filter((p) => blockOf(p.item) === blockIndex),
    [progress],
  );

  const draftFor = useCallback(
    (order: number, setNumber: number): SetDraft => {
      const saved = state?.drafts[draftKey(order, setNumber)];
      if (saved) return saved;
      const p = progress[order];
      if (!p) return { weightKg: 0, reps: 0, difficulty: null };
      return {
        ...prefillSet(
          setNumber,
          p.previous,
          { repsMin: p.item.repsMin, repsMax: p.item.repsMax },
          p.exercise?.equipment ?? 'other',
          p.done,
        ),
        difficulty: null,
      };
    },
    [progress, state?.drafts],
  );

  const setDraft = (order: number, setNumber: number, patch: Partial<SetDraft>) =>
    setState(
      (s) =>
        s && {
          ...s,
          drafts: {
            ...s.drafts,
            [draftKey(order, setNumber)]: { ...draftFor(order, setNumber), ...patch },
          },
        },
    );

  /** Exercice affiché, borné aux exercices du bloc courant. */
  const setCurrent = (order: number) =>
    setState((s) => {
      if (!s) return s;
      const orders = s.plan.flatMap((item, o) =>
        blockOf(item) === (s.currentBlock ?? 0) ? [o] : [],
      );
      if (orders.length === 0) return s;
      const clamped = Math.max(orders[0]!, Math.min(order, orders[orders.length - 1]!));
      return { ...s, current: clamped };
    });

  const addPlannedSet = (order: number) =>
    setState(
      (s) => s && { ...s, extraSets: { ...s.extraSets, [order]: (s.extraSets[order] ?? 0) + 1 } },
    );

  const startRest = (seconds: number, nextOrder: number, nextSetNumber: number) => {
    const exerciseName = progress[nextOrder]?.exercise?.name ?? '';
    const startedAt = Date.now();
    const endsAt = startedAt + seconds * 1000;
    startRestActivity({ sessionId, startedAt, endsAt, nextSetNumber, exerciseName });
    setState(
      (s) =>
        s && {
          ...s,
          rest: {
            endsAt,
            durationSeconds: seconds,
            nextOrder,
            nextSetNumber,
            notificationId: null,
          },
        },
    );
    void scheduleRestEnd(
      seconds,
      fr.workout.rest.notificationTitle,
      fr.workout.rest.notificationBody(nextSetNumber, exerciseName),
    ).then((notificationId) =>
      setState((s) => (s?.rest ? { ...s, rest: { ...s.rest, notificationId } } : s)),
    );
  };

  const stopRest = () => {
    cancelRestNotification(state?.rest?.notificationId);
    endRestActivities();
    setState((s) => s && { ...s, rest: null });
  };

  // —— Blocs ——

  const runOf = (index: number): BlockRun => state?.runs?.[index] ?? newRun();
  const setRun = (index: number, run: BlockRun) =>
    setState((s) => s && { ...s, runs: { ...(s.runs ?? {}), [index]: run } });

  /** Début d'un bloc à séries (muscu, cardio) : à la première série ou à l'ouverture du bloc. */
  const ensureStarted = (index: number) => {
    const run = runOf(index);
    if (run.startedAt !== null || !state?.blocks) return;
    const now = Date.now();
    updateSessionBlock(db, blocks[index]?.id ?? '', { startedAt: iso(now) });
    setRun(index, { ...run, startedAt: now });
  };

  /** Signaux d'un circuit à partir de maintenant (intervalles restants). */
  const scheduleCircuitSignals = (index: number, run: BlockRun, now: number) => {
    const block = blocks[index];
    if (block?.type !== 'circuit') return;
    const config = parseBlockConfig('circuit', block.config);
    const elapsed = activeSeconds(run, now);
    const times = signalTimes(config);
    void scheduleSignals(
      t.circuit.signalTitle,
      times.map((at, i) => ({
        inSeconds: at - elapsed,
        body:
          i === times.length - 1
            ? t.circuit.signalEnd
            : config.format === 'tabata' && i % 2 === 0
              ? t.circuit.signalRest
              : t.circuit.signalRound(config.format === 'tabata' ? (i + 1) / 2 + 1 : i + 2),
      })),
    ).then((notificationIds) =>
      setState((s) => {
        const current = s?.runs?.[index];
        return s && current
          ? { ...s, runs: { ...s.runs, [index]: { ...current, notificationIds } } }
          : s;
      }),
    );
  };

  /** Ouvre un bloc (sans démarrer le chrono d'un bloc minuté : il a son bouton « Démarrer »). */
  const goToBlock = (index: number) => {
    if (!state || index < 0 || index >= blocks.length) return;
    const first = state.plan.findIndex((item) => blockOf(item) === index);
    setState((s) => s && { ...s, currentBlock: index, current: first === -1 ? s.current : first });
    if (hasSetRows(blocks[index])) ensureStarted(index);
  };

  /** Démarre le chrono d'un bloc minuté (échauffement, Hyrox, circuit). */
  const startBlock = (index: number) => {
    const block = blocks[index];
    if (!block) return;
    const now = Date.now();
    let run: BlockRun = { ...newRun(), startedAt: now };
    if (block.type === 'hyrox') {
      const config = parseBlockConfig('hyrox', block.config);
      const segments = itemsOf(index).map((p) => ({ kind: p.item.segment?.kind ?? 'run' }));
      run = startHyrox(now, segments, config.timeTransitions ?? false);
    }
    updateSessionBlock(db, block.id, { startedAt: iso(now) });
    setRun(index, run);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    scheduleCircuitSignals(index, run, now);
  };

  /** Résultat d'un bloc à partir de ses séries (cardio, Hyrox même interrompu). */
  const resultFromSets = (index: number, run: BlockRun): JsonObject => {
    const block = blocks[index];
    if (!block) return {};
    const blockSets = listSessionSets(db, sessionId).filter((s) => s.blockId === block.id);
    if (block.type === 'cardio') {
      return {
        totalDistanceM: blockSets.reduce((sum, s) => sum + (s.distanceM ?? 0), 0),
        totalS: blockSets.reduce((sum, s) => sum + (s.durationS ?? 0), 0),
      };
    }
    if (block.type === 'hyrox') {
      const items = itemsOf(index);
      const durations = items.map(
        (p) => blockSets.find((s) => s.exerciseOrder === p.order)?.durationS ?? null,
      );
      const config = parseBlockConfig('hyrox', block.config);
      // `splits` : temps de chaque segment dans l'ordre (récap, comparaison avec la dernière fois).
      return {
        ...hyroxResult(
          items.map((p) => ({ kind: p.item.segment?.kind ?? 'run' })),
          durations,
          config.timeTransitions ? (run.hyrox?.transitions ?? []) : null,
        ),
        splits: durations,
      };
    }
    if (block.type === 'circuit') {
      const config = parseBlockConfig('circuit', block.config);
      if (config.format === 'amrap') return { rounds: run.rounds ?? 0, extraReps: 0 };
    }
    return {};
  };

  /** Termine un bloc avec son résultat (SPEC_V2 §4.4). */
  const completeBlock = (index: number, result?: JsonObject) => {
    const block = blocks[index];
    if (!block) return;
    const run = runOf(index);
    const now = Date.now();
    const ended = resumeRun(run, now);
    cancelSignals(run.notificationIds);
    updateSessionBlock(db, block.id, {
      startedAt: iso(run.startedAt ?? now),
      endedAt: iso(ended.endedAt ?? now),
      result: result ?? resultFromSets(index, ended),
    });
    setRun(index, { ...ended, endedAt: ended.endedAt ?? now, notificationIds: [] });
  };

  /** Bloc suivant : le bloc à séries courant est terminé, le suivant s'ouvre. */
  const nextBlock = () => {
    if (hasSetRows(blocks[currentBlock]) && runOf(currentBlock).endedAt === null) {
      completeBlock(currentBlock);
    }
    goToBlock(currentBlock + 1);
  };

  const pause = () => {
    const run = runOf(currentBlock);
    cancelSignals(run.notificationIds);
    setRun(currentBlock, { ...pauseRun(run, Date.now()), notificationIds: [] });
  };

  const resume = () => {
    const now = Date.now();
    const run = resumeRun(runOf(currentBlock), now);
    setRun(currentBlock, run);
    scheduleCircuitSignals(currentBlock, run, now);
  };

  /** Hyrox : un tap = segment (ou transition) terminé, avec l'enregistrement de son temps. */
  const tapHyrox = (): { label: string; durationS: number } | null => {
    const block = blocks[currentBlock];
    if (block?.type !== 'hyrox') return null;
    const config = parseBlockConfig('hyrox', block.config);
    const items = itemsOf(currentBlock);
    const now = Date.now();
    const tap = hyroxTap(
      runOf(currentBlock),
      items.map((p) => ({ kind: p.item.segment?.kind ?? 'run' })),
      config.timeTransitions ?? false,
      now,
    );
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    let run = tap.run;
    if (tap.finished) {
      const p = items[tap.finished.segment];
      if (p) {
        const setId = addSet(db, userId, {
          sessionId,
          exerciseId: p.item.exerciseId,
          exerciseOrder: p.order,
          setNumber: 1,
          weightKg: p.item.targetWeightKg ?? 0,
          reps: p.item.segment?.reps ?? 0,
          difficulty: null,
          blockId: block.id,
          distanceM: p.item.targetDistanceM ?? null,
          durationS: tap.finished.durationS,
        });
        run = { ...run, lastTap: run.lastTap && { ...run.lastTap, setId } };
      }
    }
    if (tap.done) {
      updateSessionBlock(db, block.id, {
        endedAt: iso(now),
        result: resultFromSets(currentBlock, run),
      });
    }
    setRun(currentBlock, run);
    return tap.finished ? { label: '', durationS: tap.finished.durationS } : null;
  };

  /** Annule le dernier tap Hyrox (5 s) : série supprimée, retour au segment précédent. */
  const undoHyrox = () => {
    const run = runOf(currentBlock);
    if (!canUndo(run, Date.now()) || !run.lastTap) return;
    if (run.lastTap.setId) deleteSet(db, run.lastTap.setId);
    if (run.endedAt !== null) {
      updateSessionBlock(db, blocks[currentBlock]?.id ?? '', { endedAt: null, result: {} });
    }
    setRun(currentBlock, undoHyroxTap(run));
  };

  /** AMRAP : +1 tour (ou −1). */
  const addRound = (delta: number) => {
    const run = runOf(currentBlock);
    if (delta > 0) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else void Haptics.selectionAsync();
    setRun(currentBlock, { ...run, rounds: Math.max(0, (run.rounds ?? 0) + delta) });
  };

  /** Cardio : chrono de la série démarré d'un tap, arrêté d'un autre. */
  const startEffort = (order: number, setNumber: number) => {
    ensureStarted(currentBlock);
    stopRest();
    void Haptics.selectionAsync();
    setState((s) => s && { ...s, effort: { order, setNumber, startedAt: Date.now() } });
  };

  const cancelEffort = () => setState((s) => s && { ...s, effort: null });

  /** Enregistre une série mesurée (cardio) puis lance la récup s'il reste des séries. */
  const validateMeasured = (order: number, setNumber: number, values: MeasuredSet) => {
    const p = progress[order];
    if (!p) return;
    const block = blocks[blockOf(p.item)];
    ensureStarted(blockOf(p.item));
    addSet(db, userId, {
      sessionId,
      exerciseId: p.item.exerciseId,
      exerciseOrder: order,
      setNumber,
      weightKg: values.weightKg ?? 0,
      reps: values.reps ?? 0,
      difficulty: null,
      blockId: block?.id || null,
      distanceM: values.distanceM ?? null,
      durationS: values.durationS ?? null,
      calories: values.calories ?? null,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setState((s) => s && { ...s, effort: null });
    afterSet(p, setNumber);
  };

  /** Suite d'une série : même exercice s'il reste des séries, sinon le suivant du bloc ; repos. */
  const afterSet = (p: ExerciseProgress, setNumber: number) => {
    cancelRestNotification(state?.rest?.notificationId);
    endRestActivities();
    const blockIndex = blockOf(p.item);
    let nextOrder: number | null = p.order;
    let nextSetNumber = setNumber + 1;
    if (setNumber >= p.planned) {
      const sameBlock = itemsOf(blockIndex);
      const remaining = (o: ExerciseProgress) => o.order !== p.order && o.done.length < o.planned;
      const next =
        sameBlock.filter((o) => o.order > p.order).find(remaining) ?? sameBlock.find(remaining);
      nextOrder = next?.order ?? null;
      nextSetNumber = next ? next.done.length + 1 : 0;
    }
    setState(
      (s) =>
        s && {
          ...s,
          drafts: omit(s.drafts, draftKey(p.order, setNumber)),
          current: nextOrder ?? s.current,
          rest: null,
        },
    );
    if (nextOrder !== null && p.item.restSeconds > 0) {
      startRest(p.item.restSeconds, nextOrder, nextSetNumber);
    }
  };

  /** Valide la série active de l'exercice affiché (musculation), puis lance le repos. */
  const validate = () => {
    if (!state) return;
    const order = state.current;
    const p = progress[order];
    const setNumber = p?.activeSetNumber;
    if (!p || !setNumber) return;
    const draft = draftFor(order, setNumber);
    ensureStarted(blockOf(p.item));
    addSet(db, userId, {
      sessionId,
      exerciseId: p.item.exerciseId,
      exerciseOrder: order,
      setNumber,
      weightKg: draft.weightKg,
      reps: draft.reps,
      difficulty: draft.difficulty,
      blockId: blocks[blockOf(p.item)]?.id || null,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    afterSet(p, setNumber);
  };

  const editSet = (id: string, patch: Partial<SetDraft>) => updateSet(db, id, patch);
  const removeSet = (id: string) => deleteSetAndRenumber(db, id);

  const adjustRest = (deltaSeconds: number) => {
    const rest = state?.rest;
    if (!rest) return;
    const remaining = Math.max(0, (rest.endsAt - Date.now()) / 1000 + deltaSeconds);
    cancelRestNotification(rest.notificationId);
    if (remaining <= 0) return stopRest();
    startRest(Math.round(remaining), rest.nextOrder, rest.nextSetNumber);
  };

  /** Séries prévues restantes (blocs à séries : muscu et cardio). */
  const remainingSets = progress.reduce(
    (sum, p) => (hasSetRows(blocks[blockOf(p.item)]) ? sum + (p.planned - p.done.length) : sum),
    0,
  );
  /** Blocs minutés pas encore terminés (échauffement, Hyrox, circuit). */
  const unfinishedBlocks = state?.blocks
    ? blocks.filter((b, i) => !hasSetRows(b) && runOf(i).endedAt === null).length
    : 0;

  const finish = (): 'finished' | 'discarded' => {
    cancelRestNotification(state?.rest?.notificationId);
    endRestActivities();
    // Blocs commencés et pas terminés : fermés avec ce qui a été fait.
    blocks.forEach((block, index) => {
      const run = runOf(index);
      if (block.id && run.startedAt !== null && run.endedAt === null) completeBlock(index);
    });
    const result = endWorkout(db, sessionId);
    // Fin de séance : on envoie tout de suite (SPEC 7).
    requestSync();
    return result;
  };

  return {
    state,
    session,
    progress,
    sets,
    blocks,
    currentBlock,
    itemsOf,
    runOf,
    draftFor,
    setDraft,
    setCurrent,
    addPlannedSet,
    validate,
    validateMeasured,
    editSet,
    removeSet,
    adjustRest,
    stopRest,
    remainingSets,
    unfinishedBlocks,
    goToBlock,
    startBlock,
    completeBlock,
    nextBlock,
    pause,
    resume,
    tapHyrox,
    undoHyrox,
    addRound,
    startEffort,
    cancelEffort,
    finish,
  };
}

export type Workout = ReturnType<typeof useWorkout>;
