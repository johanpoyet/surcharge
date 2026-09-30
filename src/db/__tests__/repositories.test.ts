/**
 * @jest-environment node
 */
import { eq } from 'drizzle-orm';

import { exercises, outbox, profiles, sessionSets, templateExercises } from '@/db/schema';
import { DEFAULT_EXERCISES } from '@/db/seed';
import {
  createExercise,
  deleteExercise,
  getExercise,
  listExercises,
  seedDefaultExercises,
  updateExercise,
} from '@/features/exercises/repository';
import {
  clearOverride,
  setOverride,
  setWeekdayTemplate,
  templateIdForDate,
} from '@/features/planning/repository';
import {
  getProfile,
  listBodyWeights,
  saveBodyWeight,
  saveRemoteProfile,
  updateProfile,
} from '@/features/profile/repository';
import {
  createTemplate,
  deleteTemplate,
  listTemplateExercises,
  listTemplates,
  setTemplateExercises,
} from '@/features/templates/repository';
import {
  addSet,
  deleteSet,
  finishSession,
  getActiveSession,
  listSessionSets,
  startSession,
  updateSet,
} from '@/features/workout/repository';
import type { AppDatabase } from '@/db/client';
import { createTestDb } from '@/test/testDb';

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

let db: AppDatabase;

beforeEach(async () => {
  db = await createTestDb();
});

const outboxFor = (rowId: string) => db.select().from(outbox).where(eq(outbox.rowId, rowId)).all();

describe('exercices', () => {
  it('crée un exercice et l’ajoute à l’outbox dans la même opération', () => {
    const id = createExercise(db, USER, {
      name: '  Presse à cuisses 45° ',
      muscle: 'legs',
      equipment: 'machine',
    });
    const row = getExercise(db, id);
    expect(row).toMatchObject({ name: 'Presse à cuisses 45°', weightStep: 5, dirty: true });
    expect(outboxFor(id)).toEqual([
      expect.objectContaining({ tableName: 'exercises', op: 'upsert' }),
    ]);
  });

  it('pas par défaut 2,5 kg hors machine', () => {
    const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
    expect(getExercise(db, id)?.weightStep).toBe(2.5);
  });

  it('une modification garde une seule entrée d’outbox par ligne', () => {
    const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
    updateExercise(db, id, { name: 'Squat barre haute', note: 'Pieds largeur épaules' });
    expect(getExercise(db, id)).toMatchObject({
      name: 'Squat barre haute',
      note: 'Pieds largeur épaules',
    });
    expect(outboxFor(id)).toHaveLength(1);
  });

  it('suppression douce : masqué de la liste, conservé en base', () => {
    const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
    deleteExercise(db, id);
    expect(listExercises(db, USER)).toHaveLength(0);
    expect(getExercise(db, id)?.deletedAt).not.toBeNull();
    expect(outboxFor(id)[0]?.op).toBe('delete');
  });

  it('chaque utilisateur ne voit que ses exercices, triés par nom', () => {
    createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
    createExercise(db, USER, { name: 'Curl barre', muscle: 'arms', equipment: 'barbell' });
    createExercise(db, OTHER, { name: 'Dips', muscle: 'chest', equipment: 'bodyweight' });
    expect(listExercises(db, USER).map((e) => e.name)).toEqual(['Curl barre', 'Squat']);
  });

  it('la bibliothèque par défaut n’est ajoutée qu’une fois', () => {
    expect(seedDefaultExercises(db, USER)).toBe(DEFAULT_EXERCISES.length);
    expect(seedDefaultExercises(db, USER)).toBe(0);
    expect(listExercises(db, USER)).toHaveLength(DEFAULT_EXERCISES.length);
    expect(db.select().from(outbox).all()).toHaveLength(DEFAULT_EXERCISES.length);
    expect(DEFAULT_EXERCISES.length).toBeGreaterThanOrEqual(30);
  });
});

describe('profil et pesées', () => {
  const remote = {
    id: USER,
    first_name: 'Johan',
    goal: 'muscle' as const,
    sessions_per_week: 3,
    weight_unit: 'kg' as const,
    default_rest_seconds: 120,
    reminders_enabled: true,
    created_at: '2026-09-28T10:00:00.000Z',
    updated_at: '2026-09-28T10:00:00.000Z',
  };

  it('copie le profil distant sans l’ajouter à l’outbox', () => {
    saveRemoteProfile(db, remote);
    expect(getProfile(db, USER)).toMatchObject({ firstName: 'Johan', dirty: false });
    expect(db.select().from(outbox).all()).toHaveLength(0);
  });

  it('n’écrase pas une modification locale non envoyée', () => {
    saveRemoteProfile(db, remote);
    updateProfile(db, USER, { weightUnit: 'lb' });
    saveRemoteProfile(db, { ...remote, weight_unit: 'kg' });
    expect(getProfile(db, USER)?.weightUnit).toBe('lb');
    expect(outboxFor(USER)).toHaveLength(1);
  });

  it('une pesée par jour : la nouvelle remplace la précédente', () => {
    const first = saveBodyWeight(db, USER, '2026-09-28', 78.4);
    const second = saveBodyWeight(db, USER, '2026-09-28', 78.1);
    saveBodyWeight(db, USER, '2026-09-29', 78);
    expect(second).toBe(first);
    expect(listBodyWeights(db, USER).map((w) => [w.measuredOn, w.weightKg])).toEqual([
      ['2026-09-29', 78],
      ['2026-09-28', 78.1],
    ]);
  });

  it('pesée déjà synchronisée (onboarding) : ni dirty, ni outbox', () => {
    const id = saveBodyWeight(db, USER, '2026-09-28', 78.4, { synced: true });
    expect(listBodyWeights(db, USER)[0]).toMatchObject({ id, dirty: false });
    expect(outboxFor(id)).toHaveLength(0);
  });
});

describe('séances types', () => {
  it('crée une séance type avec ses exercices dans l’ordre', () => {
    const [a, b] = [
      createExercise(db, USER, { name: 'A', muscle: 'chest', equipment: 'barbell' }),
      createExercise(db, USER, { name: 'B', muscle: 'chest', equipment: 'barbell' }),
    ];
    const id = createTemplate(db, USER, 'Push A', [
      { exerciseId: a, targetSets: 4, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
      { exerciseId: b, targetSets: 3, targetRepsMin: null, targetRepsMax: null, restSeconds: 90 },
    ]);
    expect(listTemplates(db, USER).map((t) => t.name)).toEqual(['Push A']);
    expect(listTemplateExercises(db, id).map((i) => [i.exerciseId, i.position])).toEqual([
      [a, 0],
      [b, 1],
    ]);
  });

  it('réordonne, ajoute et retire des exercices', () => {
    const [a, b, c] = ['A', 'B', 'C'].map((name) =>
      createExercise(db, USER, { name, muscle: 'chest', equipment: 'barbell' }),
    );
    const base = { targetSets: 3, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 120 };
    const id = createTemplate(db, USER, 'Push A', [
      { ...base, exerciseId: a! },
      { ...base, exerciseId: b! },
    ]);
    const [itemA, itemB] = listTemplateExercises(db, id);
    setTemplateExercises(db, USER, id, [
      { ...base, id: itemB!.id, exerciseId: b! },
      { ...base, exerciseId: c! },
    ]);
    expect(listTemplateExercises(db, id).map((i) => i.exerciseId)).toEqual([b, c]);
    const removed = db
      .select()
      .from(templateExercises)
      .where(eq(templateExercises.id, itemA!.id))
      .get();
    expect(removed?.deletedAt).not.toBeNull();
  });

  it('supprimer une séance type supprime ses lignes', () => {
    const a = createExercise(db, USER, { name: 'A', muscle: 'chest', equipment: 'barbell' });
    const id = createTemplate(db, USER, 'Push A', [
      { exerciseId: a, targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, restSeconds: 120 },
    ]);
    deleteTemplate(db, id);
    expect(listTemplates(db, USER)).toHaveLength(0);
    expect(listTemplateExercises(db, id)).toHaveLength(0);
  });
});

describe('planning', () => {
  // Lundi 28 septembre 2026 et lundi suivant.
  const monday = new Date(2026, 8, 28);
  const nextMonday = new Date(2026, 9, 5);

  it('résout la séance du jour : exception > modèle de semaine > repos', () => {
    setWeekdayTemplate(db, USER, 1, 'push-a');
    expect(templateIdForDate(db, USER, monday)).toBe('push-a');
    expect(templateIdForDate(db, USER, new Date(2026, 8, 29))).toBeNull();

    setOverride(db, USER, '2026-09-28', 'pull-a');
    expect(templateIdForDate(db, USER, monday)).toBe('pull-a');
    expect(templateIdForDate(db, USER, nextMonday)).toBe('push-a');

    setOverride(db, USER, '2026-09-28', null);
    expect(templateIdForDate(db, USER, monday)).toBeNull();

    clearOverride(db, USER, '2026-09-28');
    expect(templateIdForDate(db, USER, monday)).toBe('push-a');
  });

  it('un seul modèle par jour de semaine', () => {
    setWeekdayTemplate(db, USER, 1, 'push-a');
    setWeekdayTemplate(db, USER, 1, 'legs');
    expect(templateIdForDate(db, USER, monday)).toBe('legs');
    setWeekdayTemplate(db, USER, 1, null);
    expect(templateIdForDate(db, USER, monday)).toBeNull();
  });
});

describe('séance en cours', () => {
  it('enregistre, modifie et supprime des séries', () => {
    const exerciseId = createExercise(db, USER, {
      name: 'A',
      muscle: 'chest',
      equipment: 'barbell',
    });
    const sessionId = startSession(db, USER, { templateId: null, name: 'Push A' });
    expect(getActiveSession(db, USER)?.id).toBe(sessionId);

    const set = {
      sessionId,
      exerciseId,
      exerciseOrder: 0,
      weightKg: 82.5,
      reps: 8,
      difficulty: 'easy' as const,
    };
    const s1 = addSet(db, USER, { ...set, setNumber: 1 });
    const s2 = addSet(db, USER, { ...set, setNumber: 2, reps: 7 });
    updateSet(db, s2, { reps: 6, difficulty: 'hard' });
    deleteSet(db, s1);

    expect(listSessionSets(db, sessionId).map((s) => [s.setNumber, s.reps, s.difficulty])).toEqual([
      [2, 6, 'hard'],
    ]);
    expect(db.select().from(sessionSets).all()).toHaveLength(2);

    finishSession(db, sessionId);
    expect(getActiveSession(db, USER)).toBeUndefined();
  });

  it('un ressenti optionnel est enregistré comme null', () => {
    const sessionId = startSession(db, USER, { templateId: null, name: 'Libre' });
    const id = addSet(db, USER, {
      sessionId,
      exerciseId: 'x',
      exerciseOrder: 0,
      setNumber: 1,
      weightKg: 20,
      reps: 10,
      difficulty: null,
    });
    expect(listSessionSets(db, sessionId)[0]).toMatchObject({ id, difficulty: null });
  });
});

it('les tables locales portent bien les colonnes de synchro', () => {
  const id = createExercise(db, USER, { name: 'A', muscle: 'chest', equipment: 'barbell' });
  const row = db.select().from(exercises).where(eq(exercises.id, id)).get();
  expect(row).toMatchObject({ dirty: true, deletedAt: null, photoLocalUri: null, photoPath: null });
  expect(db.select().from(profiles).all()).toHaveLength(0);
});

describe('bibliothèque vide', () => {
  it('ajoute seulement les exercices de base manquants', async () => {
    const { addMissingDefaultExercises } = jest.requireActual<
      typeof import('@/features/exercises/repository')
    >('@/features/exercises/repository');
    createExercise(db, USER, { name: 'squat', muscle: 'legs', equipment: 'barbell' });
    expect(addMissingDefaultExercises(db, USER)).toBe(DEFAULT_EXERCISES.length - 1);
    expect(addMissingDefaultExercises(db, USER)).toBe(0);
    expect(listExercises(db, USER)).toHaveLength(DEFAULT_EXERCISES.length);
  });

  it('fonctionne même après avoir tout supprimé', async () => {
    const { addMissingDefaultExercises } = jest.requireActual<
      typeof import('@/features/exercises/repository')
    >('@/features/exercises/repository');
    const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
    deleteExercise(db, id);
    expect(seedDefaultExercises(db, USER)).toBe(0);
    expect(addMissingDefaultExercises(db, USER)).toBe(DEFAULT_EXERCISES.length);
  });
});
