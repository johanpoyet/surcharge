/**
 * @jest-environment node
 */
import type { AppDatabase } from '@/db/client';
import { outbox, type SyncedTableName } from '@/db/schema';
import {
  createExercise,
  getExercise,
  listExercises,
  updateExercise,
} from '@/features/exercises/repository';
import { saveTemplate } from '@/features/templates/repository';
import { addSet, startSession } from '@/features/workout/repository';
import { createTestDb } from '@/test/testDb';
import { fromRemote, toRemote, type RemoteRow } from '../mapping';
import { pullAll } from '../pull';
import { pushOutbox } from '../push';
import type { RemoteApi } from '../remote';

const USER = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

/** Faux Supabase : tables en mémoire, updated_at fixé par le « serveur ». */
function fakeRemote() {
  const tables = new Map<string, Map<string, RemoteRow>>();
  let clock = Date.parse('2026-09-30T10:00:00.000Z');
  let failNext = false;
  const api: RemoteApi = {
    async upsert(table, rows) {
      if (failNext) {
        failNext = false;
        throw new Error('réseau');
      }
      const store = tables.get(table) ?? new Map<string, RemoteRow>();
      for (const row of rows) {
        clock += 1000;
        store.set(String(row.id), { ...row, updated_at: new Date(clock).toISOString() });
      }
      tables.set(table, store);
    },
    async changedSince(table, since, offset, limit) {
      return [...(tables.get(table)?.values() ?? [])]
        .filter((r) => !since || String(r.updated_at) >= since)
        .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)))
        .slice(offset, offset + limit);
    },
  };
  return {
    api,
    rows: (table: SyncedTableName) => [...(tables.get(table)?.values() ?? [])],
    failOnce: () => {
      failNext = true;
    },
  };
}

let db: AppDatabase;
beforeEach(async () => {
  db = await createTestDb();
});

const pending = () => db.select().from(outbox).all();

it('conversion local ↔ Supabase : noms de colonnes, colonnes locales exclues', () => {
  const id = createExercise(db, USER, {
    name: 'Squat',
    muscle: 'legs',
    equipment: 'barbell',
    photoLocalUri: 'file:///x.jpg',
  });
  const remote = toRemote('exercises', getExercise(db, id)!);
  expect(remote).toMatchObject({
    id,
    user_id: USER,
    name: 'Squat',
    weight_step: 2.5,
    photo_path: null,
  });
  expect(remote).not.toHaveProperty('dirty');
  expect(remote).not.toHaveProperty('photo_local_uri');
  expect(
    fromRemote('exercises', { ...remote, updated_at: '2026-09-30T10:00:00.123456+00:00' }),
  ).toMatchObject({
    userId: USER,
    weightStep: 2.5,
    updatedAt: '2026-09-30T10:00:00.123Z',
    dirty: false,
  });
});

it('push : toutes les tables dans l’ordre, outbox vidée, lignes plus « dirty »', async () => {
  const remote = fakeRemote();
  const exerciseId = createExercise(db, USER, {
    name: 'Squat',
    muscle: 'legs',
    equipment: 'barbell',
  });
  saveTemplate(db, USER, {
    name: 'Legs',
    weekdays: [1],
    items: [{ exerciseId, targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180 }],
  });
  const sessionId = startSession(db, USER, { templateId: null, name: 'Legs' });
  addSet(db, USER, {
    sessionId,
    exerciseId,
    exerciseOrder: 0,
    setNumber: 1,
    weightKg: 100,
    reps: 5,
    difficulty: 'hard',
  });

  const result = await pushOutbox(db, remote.api, USER);
  // exercice, séance type, son bloc Musculation, ligne de séance type, jour, séance, série
  expect(result).toEqual({ pushed: 7, failed: 0 });
  // Clés étrangères côté Supabase : le bloc part avant les exercices qui y sont rattachés.
  const [block] = remote.rows('template_blocks');
  const [item] = remote.rows('template_exercises');
  expect(item?.block_id).toBe(block?.id);
  expect(String(block?.updated_at) < String(item?.updated_at)).toBe(true);
  expect(pending()).toHaveLength(0);
  expect(getExercise(db, exerciseId)?.dirty).toBe(false);
  expect(remote.rows('session_sets')[0]).toMatchObject({
    weight_kg: 100,
    difficulty: 'hard',
    user_id: USER,
  });
});

it('push en échec : attempts + 1, rien de perdu, réessai réussi ensuite', async () => {
  const remote = fakeRemote();
  createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
  remote.failOnce();
  expect(await pushOutbox(db, remote.api, USER)).toEqual({ pushed: 0, failed: 1 });
  expect(pending()[0]?.attempts).toBe(1);
  expect(await pushOutbox(db, remote.api, USER)).toEqual({ pushed: 1, failed: 0 });
  expect(pending()).toHaveLength(0);
});

it('une modification faite pendant l’envoi repart au push suivant', async () => {
  const remote = fakeRemote();
  const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
  const original = remote.api.upsert;
  remote.api.upsert = async (table, rows) => {
    updateExercise(db, id, { name: 'Squat barre haute' }); // pendant l'envoi
    remote.api.upsert = original;
    return original(table, rows);
  };
  await pushOutbox(db, remote.api, USER);
  expect(pending()).toHaveLength(1);
  expect(getExercise(db, id)?.dirty).toBe(true);
  await pushOutbox(db, remote.api, USER);
  expect(remote.rows('exercises')[0]?.name).toBe('Squat barre haute');
});

it('push : les lignes d’un autre compte restent dans l’outbox', async () => {
  const remote = fakeRemote();
  createExercise(db, OTHER, { name: 'Dips', muscle: 'chest', equipment: 'bodyweight' });
  expect(await pushOutbox(db, remote.api, USER)).toEqual({ pushed: 0, failed: 0 });
  expect(pending()).toHaveLength(1);
});

it('nouvel appareil : le pull retrouve tout ; puis seulement les nouveautés', async () => {
  const remote = fakeRemote();
  const exerciseId = createExercise(db, USER, {
    name: 'Squat',
    muscle: 'legs',
    equipment: 'barbell',
  });
  const sessionId = startSession(db, USER, { templateId: null, name: 'Legs' });
  addSet(db, USER, {
    sessionId,
    exerciseId,
    exerciseOrder: 0,
    setNumber: 1,
    weightKg: 100,
    reps: 5,
    difficulty: null,
  });
  await pushOutbox(db, remote.api, USER);

  const phone2 = await createTestDb();
  expect(await pullAll(phone2, remote.api, USER)).toBe(3);
  expect(listExercises(phone2, USER).map((e) => [e.name, e.dirty])).toEqual([['Squat', false]]);
  expect(phone2.select().from(outbox).all()).toHaveLength(0);

  createExercise(db, USER, { name: 'Dips', muscle: 'chest', equipment: 'bodyweight' });
  await pushOutbox(db, remote.api, USER);
  await pullAll(phone2, remote.api, USER);
  expect(listExercises(phone2, USER).map((e) => e.name)).toEqual(['Dips', 'Squat']);
});

it('pull : une modification locale pas encore envoyée n’est pas écrasée', async () => {
  const remote = fakeRemote();
  const id = createExercise(db, USER, { name: 'Squat', muscle: 'legs', equipment: 'barbell' });
  await pushOutbox(db, remote.api, USER);
  const phone2 = await createTestDb();
  await pullAll(phone2, remote.api, USER);

  updateExercise(phone2, id, { name: 'Squat (téléphone 2)' });
  updateExercise(db, id, { name: 'Squat (téléphone 1)' });
  await pushOutbox(db, remote.api, USER);
  await pullAll(phone2, remote.api, USER);
  expect(getExercise(phone2, id)?.name).toBe('Squat (téléphone 2)');

  // Le téléphone 2 envoie ensuite : sa version gagne (dernière écriture).
  await pushOutbox(phone2, remote.api, USER);
  await pullAll(db, remote.api, USER);
  expect(getExercise(db, id)?.name).toBe('Squat (téléphone 2)');
});

it('pull : une photo changée ailleurs invalide la copie locale', async () => {
  const remote = fakeRemote();
  const id = createExercise(db, USER, {
    name: 'Presse',
    muscle: 'legs',
    equipment: 'machine',
    photoLocalUri: 'file:///a.jpg',
  });
  updateExercise(db, id, { photoPath: `${USER}/${id}.jpg` });
  await pushOutbox(db, remote.api, USER);
  const phone2 = await createTestDb();
  await pullAll(phone2, remote.api, USER);
  expect(getExercise(phone2, id)).toMatchObject({
    photoPath: `${USER}/${id}.jpg`,
    photoLocalUri: null,
  });
});

it('changer ou retirer la photo : la version en ligne est à renvoyer', () => {
  const id = createExercise(db, USER, {
    name: 'Presse',
    muscle: 'legs',
    equipment: 'machine',
    photoLocalUri: 'file:///a.jpg',
  });
  updateExercise(db, id, { photoPath: `${USER}/${id}-1.jpg` });
  updateExercise(db, id, { name: 'Presse 45°' });
  expect(getExercise(db, id)?.photoPath).toBe(`${USER}/${id}-1.jpg`);
  updateExercise(db, id, { photoLocalUri: 'file:///b.jpg' });
  expect(getExercise(db, id)?.photoPath).toBeNull();
});

it('push : lignes envoyées dans l’ordre des modifications (remplacement d’un jour)', async () => {
  const remote = fakeRemote();
  const sent: string[] = [];
  const original = remote.api.upsert;
  remote.api.upsert = async (table, rows) => {
    if (table === 'weekly_schedule')
      sent.push(...rows.map((r) => `${r.template_id}:${r.deleted_at ? 'supprimée' : 'active'}`));
    return original(table, rows);
  };
  const { assignDay } = jest.requireActual<typeof import('@/features/planning/repository')>(
    '@/features/planning/repository',
  );
  assignDay(db, USER, new Date(2026, 8, 28), 'push', true);
  await pushOutbox(db, remote.api, USER);
  assignDay(db, USER, new Date(2026, 8, 28), null, true);
  assignDay(db, USER, new Date(2026, 8, 28), 'pull', true);
  await pushOutbox(db, remote.api, USER);
  expect(sent).toEqual(['push:active', 'push:supprimée', 'pull:active']);
});
