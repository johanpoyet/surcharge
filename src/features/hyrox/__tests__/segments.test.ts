import { hyroxRunDistanceM, hyroxSegments, hyroxStations } from '../segments';

describe('générateur Hyrox', () => {
  it('complet Open Homme : 16 segments, course puis station, charges de la division', () => {
    const segments = hyroxSegments({ format: 'full', division: 'open_men' });
    expect(segments).toHaveLength(16);
    expect(segments.map((s) => s.kind).slice(0, 4)).toEqual(['run', 'station', 'run', 'station']);
    expect(segments[1]).toMatchObject({ station: 'skierg', distanceM: 1000, round: 1 });
    expect(segments[3]).toMatchObject({ station: 'sled_push', distanceM: 50, weightKg: 152 });
    const farmers = segments.find((s) => s.station === 'farmers_carry');
    expect(farmers).toMatchObject({ weightKg: 24, weightCount: 2, distanceM: 200 });
    expect(segments[15]).toMatchObject({ station: 'wall_balls', reps: 100, weightKg: 6, round: 8 });
    expect(hyroxRunDistanceM({ format: 'full', division: 'open_men' })).toBe(8000);
  });

  it('Pro Femme : charges de la division ; libre : pas de charge', () => {
    const pro = hyroxSegments({ format: 'full', division: 'pro_women' });
    expect(pro.find((s) => s.station === 'sandbag_lunges')?.weightKg).toBe(20);
    const custom = hyroxSegments({ format: 'full', division: 'custom' });
    expect(custom.every((s) => s.weightKg === undefined)).toBe(true);
  });

  it('demi : 4 courses + 4 stations (les 4 premières par défaut)', () => {
    const half = hyroxSegments({ format: 'half', division: 'open_women' });
    expect(half).toHaveLength(8);
    expect(hyroxStations({ format: 'half', division: 'open_women' }).map((s) => s.key)).toEqual([
      'skierg',
      'sled_push',
      'sled_pull',
      'burpee_broad_jumps',
    ]);
    expect(hyroxRunDistanceM({ format: 'half', division: 'open_women' })).toBe(4000);
  });

  it('station seule : un segment, sans course', () => {
    const station = hyroxSegments({
      format: 'station',
      division: 'open_men',
      stations: ['wall_balls'],
    });
    expect(station).toHaveLength(1);
    expect(station[0]).toMatchObject({ kind: 'station', station: 'wall_balls' });
    expect(hyroxRunDistanceM({ format: 'station', division: 'open_men' })).toBe(0);
  });
});
