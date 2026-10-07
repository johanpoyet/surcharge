import { progressionOf } from '@/features/home/summary';
import { recordsBeaten } from '@/features/workout/logic';
import { volume } from '../calc';
import { recordSets } from '../regularity';
import { personalRecords } from '../series';
import type { TypedSet } from '../typed';

let n = 0;
const set = (patch: Partial<TypedSet> & { exerciseId?: string; day?: number }) => {
  n += 1;
  const { day = n, exerciseId = 'x', ...rest } = patch;
  return {
    id: `s${n}`,
    sessionId: `session${day}`,
    exerciseId,
    weightKg: 0,
    reps: 0,
    difficulty: null,
    completedAt: `2026-10-${String(day).padStart(2, '0')}T10:00:00.000Z`,
    ...rest,
  };
};

describe('records par type de suivi', () => {
  it('course : record seulement sur la même distance', () => {
    const run = (distanceM: number, durationS: number, day: number) =>
      set({ exerciseId: 'run', trackingType: 'distance_time', distanceM, durationS, day });
    const records = recordSets([run(400, 95, 1), run(1000, 250, 2), run(400, 92, 3)]);
    // 1000 m : première fois sur cette distance, pas un record ; 400 m en 1:32 : record.
    expect(records.map((r) => [r.distanceM, r.durationS])).toEqual([[400, 92]]);
  });

  it('wall balls (reps seules) : plus de reps = record, jamais dans le volume', () => {
    const wb = (reps: number, day: number) =>
      set({ exerciseId: 'wb', trackingType: 'reps', weightKg: 6, reps, day });
    expect(recordSets([wb(80, 1), wb(100, 2)])).toHaveLength(1);
    expect(volume([wb(100, 1), set({ weightKg: 100, reps: 5 })])).toBe(500);
  });

  it('records battus en séance et records personnels selon le type', () => {
    const before = [set({ exerciseId: 'plank', trackingType: 'time', durationS: 60, day: 1 })];
    const today = [set({ exerciseId: 'plank', trackingType: 'time', durationS: 90, day: 2 })];
    expect(recordsBeaten(new Map([['plank', today]]), new Map([['plank', before]]))).toHaveLength(
      1,
    );
    expect(personalRecords([...before, ...today])[0]?.durationS).toBe(90);
  });

  it('la carte Progression ne prend que les exercices de musculation', () => {
    const runs = [1, 2, 3].map((day) =>
      set({
        exerciseId: 'run',
        trackingType: 'distance_time',
        distanceM: 1000,
        durationS: 300,
        day,
      }),
    );
    const squats = [1, 2].map((day) => set({ exerciseId: 'squat', weightKg: 100, reps: 5, day }));
    expect(progressionOf([...runs, ...squats])?.exerciseId).toBe('squat');
  });
});
