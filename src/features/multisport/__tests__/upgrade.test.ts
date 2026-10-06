/**
 * @jest-environment node
 */
import { and, eq, isNull } from 'drizzle-orm';

import type { AppDatabase } from '@/db/client';
import {
  exercises,
  outbox,
  profiles,
  sessions,
  sessionSets,
  templateBlocks,
  templateExercises,
  workoutTemplates,
} from '@/db/schema';
import { DEFAULT_EXERCISES } from '@/db/seed';
import { catalogExerciseId } from '@/features/exercises/catalog';
import { seedDefaultExercises } from '@/features/exercises/repository';
import { HYROX_EXERCISES } from '@/features/hyrox/catalog';
import { deleteTemplate, saveTemplate } from '@/features/templates/repository';
import { stableId } from '@/lib/stableId';
import { fromRemote, toRemote } from '@/sync/mapping';
import { createTestDb } from '@/test/testDb';

import { upgradeLocalData } from '../upgrade';

const USER = '11111111-1111-1111-1111-111111111111';
const T1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const T2 = 'aaaaaaaa-0000-4000-8000-000000000002';
const SQUAT = 'eeeeeeee-0000-4000-8000-000000000001';
const CUSTOM = 'eeeeeeee-0000-4000-8000-000000000002';
const T = '2026-09-01T10:00:00.000Z';
const synced = { createdAt: T, updatedAt: T, dirty: false };

let db: AppDatabase;
beforeEach(async () => {
  db = await createTestDb();
});

/** Données d'un compte V1 telles que reçues par le pull (aucun bloc, aucune clé de catalogue). */
function seedV1Account() {
  db.insert(profiles)
    .values({ id: USER, firstName: 'Johan', ...synced })
    .run();
  db.insert(exercises)
    .values([
      { id: SQUAT, userId: USER, name: 'Squat', muscle: 'legs', equipment: 'barbell', ...synced },
      {
        id: CUSTOM,
        userId: USER,
        name: 'Presse à cuisses 45°',
        muscle: 'legs',
        equipment: 'machine',
        ...synced,
      },
    ])
    .run();
  db.insert(workoutTemplates)
    .values([
      { id: T1, userId: USER, name: 'Legs', ...synced },
      { id: T2, userId: USER, name: 'Ancienne', ...synced, deletedAt: T },
    ])
    .run();
  db.insert(templateExercises)
    .values([
      { id: 'c1', userId: USER, templateId: T1, exerciseId: SQUAT, position: 0, ...synced },
      { id: 'c2', userId: USER, templateId: T1, exerciseId: CUSTOM, position: 1, ...synced },
      { id: 'c3', userId: USER, templateId: T2, exerciseId: SQUAT, position: 0, ...synced },
    ])
    .run();
  db.insert(sessions)
    .values({ id: 's1', userId: USER, templateId: T1, name: 'Legs', startedAt: T, ...synced })
    .run();
  db.insert(sessionSets)
    .values({
      id: 'set1',
      userId: USER,
      sessionId: 's1',
      exerciseId: SQUAT,
      exerciseOrder: 0,
      setNumber: 1,
      weightKg: 100,
      reps: 5,
      completedAt: T,
      ...synced,
    })
    .run();
}

const blocksOf = (templateId: string) =>
  db.select().from(templateBlocks).where(eq(templateBlocks.templateId, templateId)).all();

describe('reprise V2 d’un compte V1', () => {
  it('crée un bloc Musculation par séance type et y rattache ses exercices', () => {
    seedV1Account();
    upgradeLocalData(db, USER);

    const [block] = blocksOf(T1);
    expect(blocksOf(T1)).toHaveLength(1);
    expect(block).toMatchObject({ id: T1, type: 'strength', position: 0, deletedAt: null });
    const items = db.select().from(templateExercises).where(eq(templateExercises.templateId, T1));
    expect(items.all().every((item) => item.blockId === T1)).toBe(true);
    // Séance type supprimée : son bloc l'est aussi.
    expect(blocksOf(T2)[0]?.deletedAt).toBe(T);
  });

  it('laisse l’historique intact (séances et séries sans bloc = Musculation implicite)', () => {
    seedV1Account();
    upgradeLocalData(db, USER);
    expect(db.select().from(sessions).all()).toHaveLength(1);
    expect(db.select().from(sessionSets).get()).toMatchObject({
      weightKg: 100,
      reps: 5,
      blockId: null,
    });
  });

  it('reconnaît les exercices par défaut par leur nom, pas les exercices perso', () => {
    seedV1Account();
    upgradeLocalData(db, USER);
    expect(db.select().from(exercises).where(eq(exercises.id, SQUAT)).get()?.catalogKey).toBe(
      'squat',
    );
    expect(
      db.select().from(exercises).where(eq(exercises.id, CUSTOM)).get()?.catalogKey,
    ).toBeNull();
  });

  it('ajoute les modifications à l’outbox pour les envoyer', () => {
    seedV1Account();
    const changed = upgradeLocalData(db, USER);
    const queued = db.select().from(outbox).all();
    expect(changed).toBe(queued.length);
    expect(queued.map((e) => `${e.tableName}/${e.rowId}`).sort()).toEqual(
      [
        `exercises/${SQUAT}`,
        `template_blocks/${T1}`,
        `template_blocks/${T2}`,
        'template_exercises/c1',
        'template_exercises/c2',
      ].sort(),
    );
  });

  it('est idempotente', () => {
    seedV1Account();
    upgradeLocalData(db, USER);
    expect(upgradeLocalData(db, USER)).toBe(0);
    expect(db.select().from(templateBlocks).all()).toHaveLength(2);
  });

  it('ne refait rien si la reprise vient déjà de Supabase (même id de bloc)', () => {
    seedV1Account();
    // Reprise faite par la migration 0006 puis reçue par le pull.
    db.insert(templateBlocks)
      .values([
        { id: T1, userId: USER, templateId: T1, position: 0, type: 'strength', ...synced },
        {
          id: T2,
          userId: USER,
          templateId: T2,
          position: 0,
          type: 'strength',
          ...synced,
          deletedAt: T,
        },
      ])
      .run();
    db.update(templateExercises)
      .set({ blockId: T1 })
      .where(eq(templateExercises.templateId, T1))
      .run();
    db.update(templateExercises)
      .set({ blockId: T2 })
      .where(eq(templateExercises.templateId, T2))
      .run();

    upgradeLocalData(db, USER);
    expect(db.select().from(templateBlocks).all()).toHaveLength(2);
    expect(db.select().from(outbox).where(eq(outbox.tableName, 'template_blocks')).all()).toEqual(
      [],
    );
  });

  it('rattache un exercice ajouté plus tard par une ancienne version', () => {
    seedV1Account();
    upgradeLocalData(db, USER);
    db.insert(templateExercises)
      .values({ id: 'c9', userId: USER, templateId: T1, exerciseId: SQUAT, position: 2, ...synced })
      .run();
    expect(upgradeLocalData(db, USER)).toBe(1);
    expect(
      db.select().from(templateExercises).where(eq(templateExercises.id, 'c9')).get()?.blockId,
    ).toBe(T1);
  });

  it('ajoute le catalogue Hyrox si la discipline est choisie, une seule fois', () => {
    seedV1Account();
    db.update(profiles)
      .set({ disciplines: ['strength', 'hyrox'] })
      .run();
    upgradeLocalData(db, USER);

    const hyrox = db
      .select()
      .from(exercises)
      .where(and(eq(exercises.userId, USER), eq(exercises.discipline, 'hyrox')))
      .all();
    expect(hyrox).toHaveLength(HYROX_EXERCISES.length);
    const skierg = hyrox.find((e) => e.catalogKey === 'hyrox_skierg');
    expect(skierg).toMatchObject({
      id: catalogExerciseId(USER, 'hyrox_skierg'),
      trackingType: 'distance_time',
    });
    // Supprimé par l'utilisateur : pas remis.
    db.update(exercises).set({ deletedAt: T }).where(eq(exercises.id, skierg!.id)).run();
    expect(upgradeLocalData(db, USER)).toBe(0);
  });
});

describe('séances types V2', () => {
  it('une nouvelle séance type a son bloc Musculation, supprimé avec elle', () => {
    seedDefaultExercises(db, USER);
    const squat = catalogExerciseId(USER, 'squat');
    const id = saveTemplate(db, USER, {
      name: 'Legs',
      weekdays: [],
      items: [
        { exerciseId: squat, targetSets: 3, targetRepsMin: 5, targetRepsMax: 5, restSeconds: 180 },
      ],
    });
    expect(blocksOf(id)).toMatchObject([{ id, type: 'strength' }]);
    expect(
      db.select().from(templateExercises).where(eq(templateExercises.templateId, id)).get()
        ?.blockId,
    ).toBe(id);

    deleteTemplate(db, id);
    expect(
      db
        .select()
        .from(templateBlocks)
        .where(and(eq(templateBlocks.templateId, id), isNull(templateBlocks.deletedAt)))
        .all(),
    ).toEqual([]);
  });

  it('la bibliothèque par défaut porte les clés du catalogue et des ids stables', () => {
    seedDefaultExercises(db, USER);
    const all = db.select().from(exercises).all();
    expect(all).toHaveLength(DEFAULT_EXERCISES.length);
    expect(all.every((e) => e.catalogKey && e.id === catalogExerciseId(USER, e.catalogKey))).toBe(
      true,
    );
  });
});

describe('synchro des nouvelles colonnes', () => {
  it('JSON (config, disciplines) aller-retour avec Supabase', () => {
    const remoteBlock = {
      id: 'b1',
      user_id: USER,
      template_id: T1,
      position: 1,
      type: 'hyrox',
      name: null,
      config: { format: 'full', division: 'open_men' },
      created_at: T,
      updated_at: T,
      deleted_at: null,
    };
    const local = fromRemote('template_blocks', remoteBlock);
    db.insert(templateBlocks)
      .values(local as never)
      .run();
    const row = db.select().from(templateBlocks).get()!;
    expect(row.config).toEqual({ format: 'full', division: 'open_men' });
    expect(toRemote('template_blocks', row)).toEqual(remoteBlock);

    db.insert(profiles)
      .values(
        fromRemote('profiles', {
          id: USER,
          first_name: 'J',
          disciplines: ['running'],
          created_at: T,
          updated_at: T,
        }) as never,
      )
      .run();
    const profile = db.select().from(profiles).get()!;
    expect(profile.disciplines).toEqual(['running']);
    expect(toRemote('profiles', profile).disciplines).toEqual(['running']);
  });
});

describe('stableId', () => {
  it('donne le même uuid valide pour la même entrée, un autre sinon', () => {
    const a = stableId(USER, 'exercise', 'squat');
    expect(a).toBe(stableId(USER, 'exercise', 'squat'));
    expect(a).not.toBe(stableId(USER, 'exercise', 'bench_press'));
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
