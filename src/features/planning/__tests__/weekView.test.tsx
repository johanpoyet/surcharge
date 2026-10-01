import { render, screen } from '@testing-library/react-native';

import { fr } from '@/i18n/fr';
import { weekDays } from '../calendar';
import { WeekView } from '../components/WeekView';

// useDayActions ouvre la base SQLite : seul le titre du jour sert ici.
jest.mock('../useDayActions', () => ({ dayTitle: () => 'jour' }));

const t = fr.planning;
// Semaine du lundi 21 septembre 2026 ; Push prévu le lundi, rien le jeudi.
const days = weekDays(new Date(2026, 8, 21));
const push = { id: 'push', name: 'Push', exerciseCount: 4, minutes: 35, muscles: [] };

it('affiche la séance faite un jour de repos au lieu de « Repos »', async () => {
  await render(
    <WeekView
      days={days}
      weekly={new Map([[1, 'push']])}
      overrides={new Map()}
      templates={new Map([['push', push]])}
      doneSessions={
        new Map([
          ['2026-09-21', 'Push'],
          ['2026-09-24', 'Pull'],
        ])
      }
      onDayPress={jest.fn()}
    />,
  );
  expect(screen.getByText('Pull')).toBeTruthy();
  expect(screen.getByText(t.offPlan)).toBeTruthy();
  expect(screen.getAllByText(t.done)).toHaveLength(2);
  // Les 5 autres jours restent en repos.
  expect(screen.getAllByText(t.rest)).toHaveLength(5);
});
