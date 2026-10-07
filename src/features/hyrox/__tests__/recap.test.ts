import { hyroxRecap, type RecapSegment } from '../recap';

const seg = (kind: 'run' | 'station', name: string, durationS: number | null): RecapSegment => ({
  kind,
  name,
  durationS,
});

const today = [
  seg('run', 'Run 1', 280),
  seg('station', 'SkiErg', 250),
  seg('run', 'Run 2', 290),
  seg('station', 'Burpee Broad Jumps', 321),
];
// Dernière simu : même ordre de segments.
const last = [285, 244, 300, 290];

describe('récap Hyrox', () => {
  it('totaux, allure moyenne de course, transitions si mesurées', () => {
    const recap = hyroxRecap(today, null, 30, null);
    expect(recap).toMatchObject({ runS: 570, stationsS: 571, totalS: 1171, transitionsS: 30 });
    expect(recap.paceSPerKm).toBe(285);
    expect(recap.stationCount).toBe(2);
  });

  it('écart par station, station la plus lente en évidence, point faible > 10 s', () => {
    const recap = hyroxRecap(today, last, null, null);
    expect(recap.stations.map((s) => [s.name, s.deltaS, s.slowest])).toEqual([
      ['SkiErg', 6, false],
      ['Burpee Broad Jumps', 31, true],
    ]);
    expect(recap.weakPoint).toMatchObject({ name: 'Burpee Broad Jumps', deltaS: 31 });
    expect(recap.stations[1]?.ratio).toBe(1);
  });

  it('pas de point faible sous 10 s de retard', () => {
    const recap = hyroxRecap(today, [285, 244, 300, 318], null, null);
    expect(recap.weakPoint).toBeNull();
    // SkiErg +6 s, Burpees +3 s : la plus lente reste mise en évidence.
    expect(recap.stations.find((s) => s.slowest)?.name).toBe('SkiErg');
  });

  it('badge record seulement si le meilleur temps précédent est battu', () => {
    // 1141 s sans transitions.
    expect(hyroxRecap(today, null, null, 1306).recordDeltaS).toBe(-165);
    expect(hyroxRecap(today, null, null, 1100).recordDeltaS).toBeNull();
    expect(hyroxRecap(today, null, null, null).recordDeltaS).toBeNull();
  });

  it('simu interrompue : les segments non faits ne comptent pas', () => {
    const recap = hyroxRecap([...today, seg('run', 'Run 3', null)], null, null, null);
    expect(recap.totalS).toBe(1141);
  });
});
