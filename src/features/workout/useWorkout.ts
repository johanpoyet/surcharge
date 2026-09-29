import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { db, liveDb } from '@/db/client';
import { sessions, type Exercise, type SessionSet } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExercises } from '@/features/exercises/hooks';
import { fr } from '@/i18n/fr';
import { plannedSets, prefillSet, type PreviousSet, type SetDraft } from './logic';
import {
  addSet,
  deleteSetAndRenumber,
  endWorkout,
  getWorkoutState,
  lastSessionSets,
  saveWorkoutState,
  sessionSetsQuery,
  updateSet,
} from './repository';
import { cancelRestNotification, scheduleRestEnd } from './restNotifications';
import { draftKey, type WorkoutPlanItem, type WorkoutUiState } from './state';

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

const omit = <T>(record: Record<string, T>, key: string): Record<string, T> => {
  const next = { ...record };
  delete next[key];
  return next;
};

/** État et actions de l'écran de séance en cours (SPEC 8.2). */
export function useWorkout(sessionId: string) {
  const userId = useAuth().session?.user.id ?? '';
  const [state, setState] = useState<WorkoutUiState | undefined>(() =>
    getWorkoutState(db, sessionId),
  );
  // L'état est persisté à chaque changement : la séance survit à la fermeture de l'app.
  useEffect(() => {
    if (state) saveWorkoutState(db, sessionId, state);
  }, [sessionId, state]);

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

  const setCurrent = (order: number) =>
    setState((s) => s && { ...s, current: Math.max(0, Math.min(order, s.plan.length - 1)) });

  const addPlannedSet = (order: number) =>
    setState(
      (s) => s && { ...s, extraSets: { ...s.extraSets, [order]: (s.extraSets[order] ?? 0) + 1 } },
    );

  const startRest = (seconds: number, nextOrder: number, nextSetNumber: number) => {
    const exerciseName = progress[nextOrder]?.exercise?.name ?? '';
    setState(
      (s) =>
        s && {
          ...s,
          rest: {
            endsAt: Date.now() + seconds * 1000,
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
    setState((s) => s && { ...s, rest: null });
  };

  /** Valide la série active de l'exercice affiché, puis lance le repos. */
  const validate = () => {
    if (!state) return;
    const order = state.current;
    const p = progress[order];
    const setNumber = p?.activeSetNumber;
    if (!p || !setNumber) return;
    const draft = draftFor(order, setNumber);
    addSet(db, userId, {
      sessionId,
      exerciseId: p.item.exerciseId,
      exerciseOrder: order,
      setNumber,
      weightKg: draft.weightKg,
      reps: draft.reps,
      difficulty: draft.difficulty,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    cancelRestNotification(state.rest?.notificationId);

    // Suite : même exercice s'il reste des séries, sinon le prochain exercice pas terminé.
    let nextOrder: number | null = order;
    let nextSetNumber = setNumber + 1;
    if (setNumber >= p.planned) {
      const remaining = (o: ExerciseProgress) => o.order !== order && o.done.length < o.planned;
      const next = progress.slice(order + 1).find(remaining) ?? progress.find(remaining);
      nextOrder = next?.order ?? null;
      nextSetNumber = next ? next.done.length + 1 : 0;
    }
    setState(
      (s) =>
        s && {
          ...s,
          drafts: omit(s.drafts, draftKey(order, setNumber)),
          current: nextOrder ?? s.current,
          rest: null,
        },
    );
    if (nextOrder !== null) startRest(p.item.restSeconds, nextOrder, nextSetNumber);
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

  const remainingSets = progress.reduce((sum, p) => sum + (p.planned - p.done.length), 0);

  const finish = (): 'finished' | 'discarded' => {
    cancelRestNotification(state?.rest?.notificationId);
    return endWorkout(db, sessionId);
  };

  return {
    state,
    session,
    progress,
    sets,
    draftFor,
    setDraft,
    setCurrent,
    addPlannedSet,
    validate,
    editSet,
    removeSet,
    adjustRest,
    stopRest,
    remainingSets,
    finish,
  };
}
