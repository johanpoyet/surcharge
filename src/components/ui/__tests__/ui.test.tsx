import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { CalendarDays, Dumbbell, House, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Text } from 'react-native';

import {
  Button,
  ChipGroup,
  DifficultyBadge,
  DifficultyPicker,
  ProgressSegments,
  SegmentedControl,
  StackedTitle,
  StatTile,
  Stepper,
  Switch,
  TabBar,
  Tabs,
  TextField,
  ToastProvider,
  useToast,
} from '@/components/ui';
import type { Difficulty } from '@/features/workout/difficulty';
import { fr } from '@/i18n/fr';

beforeEach(() => jest.clearAllMocks());

describe('Button', () => {
  it('appelle onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Valider la série 4" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Valider la série 4' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("n'appelle pas onPress quand il est désactivé ou en chargement", async () => {
    const onPress = jest.fn();
    await render(
      <>
        <Button label="Désactivé" disabled onPress={onPress} />
        <Button label="Chargement" loading onPress={onPress} />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Désactivé' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Chargement' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.queryByText('Chargement')).toBeNull();
  });
});

function WeightStepper({ initial = 82.5, max }: { initial?: number; max?: number }) {
  const [value, setValue] = useState(initial);
  return <Stepper value={value} onChange={setValue} step={2.5} max={max} unit="kg" />;
}

describe('Stepper', () => {
  it('ajoute et retire un pas, avec virgule décimale', async () => {
    await render(<WeightStepper />);
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter 2,5 kg' }));
    expect(screen.getByText('85')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer 2,5 kg' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer 2,5 kg' }));
    expect(screen.getByText('80')).toBeTruthy();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(3);
  });

  it('respecte les bornes', async () => {
    await render(<WeightStepper initial={2.5} max={5} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Retirer 2,5 kg' }));
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retirer 2,5 kg' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter 2,5 kg' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter 2,5 kg' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ajouter 2,5 kg' }));
    expect(screen.getByText('5')).toBeTruthy();
  });

  it("répète en accélérant pendant l'appui long", async () => {
    jest.useFakeTimers();
    await render(<WeightStepper initial={0} />);
    const plus = screen.getByRole('button', { name: 'Ajouter 2,5 kg' });
    await fireEvent(plus, 'longPress');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await fireEvent(plus, 'pressOut');
    const afterRelease = Number(screen.getByText(/^\d+(,\d+)?$/).props.children.replace(',', '.'));
    // 160 + 136 + 116 + 98 + 84 + 71 + 60 + … ms : au moins 7 pas en 1 s
    expect(afterRelease).toBeGreaterThanOrEqual(7 * 2.5);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(String(afterRelease).replace('.', ','))).toBeTruthy();
    jest.useRealTimers();
  });
});

function Picker() {
  const [value, setValue] = useState<Difficulty | null>(null);
  return (
    <>
      <DifficultyPicker value={value} onChange={setValue} />
      <Text>{value ?? 'aucun'}</Text>
    </>
  );
}

describe('Ressenti', () => {
  it('sélectionne puis désélectionne', async () => {
    await render(<Picker />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Difficile' }));
    expect(screen.getByText('hard')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Difficile' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Difficile' }));
    expect(screen.getByText('aucun')).toBeTruthy();
  });

  it('vibre en « warning » sur Échec', async () => {
    await render(<Picker />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Échec' }));
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('warning');
  });

  it('affiche la lettre et un libellé accessible', async () => {
    await render(<DifficultyBadge difficulty="fail" />);
    expect(screen.getByText('✕')).toBeTruthy();
    expect(screen.getByLabelText('Ressenti : Échec')).toBeTruthy();
  });
});

describe('Sélecteurs', () => {
  it('ChipGroup multiple ajoute et retire', async () => {
    const onChange = jest.fn();
    const options = [
      { value: 'pecs', label: 'Pecs' },
      { value: 'dos', label: 'Dos' },
    ] as const;
    await render(<ChipGroup multiple options={options} value={['pecs']} onChange={onChange} />);
    await fireEvent.press(screen.getByText('Dos'));
    expect(onChange).toHaveBeenLastCalledWith(['pecs', 'dos']);
    await fireEvent.press(screen.getByText('Pecs'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('SegmentedControl et Tabs signalent le choix', async () => {
    const onPeriod = jest.fn();
    const onTab = jest.fn();
    await render(
      <>
        <SegmentedControl
          options={[
            { value: '1M', label: '1M' },
            { value: '3M', label: '3M' },
          ]}
          value="3M"
          onChange={onPeriod}
        />
        <Tabs
          options={[
            { value: 'planning', label: 'Planning' },
            { value: 'templates', label: 'Mes séances' },
          ]}
          value="planning"
          onChange={onTab}
        />
      </>,
    );
    expect(screen.getByRole('tab', { name: '3M' })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: '1M' }));
    await fireEvent.press(screen.getByRole('tab', { name: 'Mes séances' }));
    expect(onPeriod).toHaveBeenCalledWith('1M');
    expect(onTab).toHaveBeenCalledWith('templates');
  });

  it('Switch bascule', async () => {
    const onValueChange = jest.fn();
    await render(<Switch value onValueChange={onValueChange} accessibilityLabel="Rappels" />);
    expect(screen.getByRole('switch', { name: 'Rappels' })).toBeChecked();
    await fireEvent.press(screen.getByRole('switch', { name: 'Rappels' }));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});

describe('Affichage', () => {
  it('TextField affiche son erreur', async () => {
    await render(<TextField label="Mot de passe" error="8 caractères minimum" />);
    expect(screen.getByLabelText('Mot de passe')).toBeTruthy();
    expect(screen.getByText('8 caractères minimum')).toBeTruthy();
  });

  it('StatTile et StackedTitle rendent leur contenu', async () => {
    await render(
      <>
        <StatTile value="5" unit="sem." caption="de régularité" />
        <StackedTitle lines={[{ text: 'Soulève.' }, { text: 'Progresse.', accent: true }]} />
      </>,
    );
    expect(screen.getByLabelText('5 sem. de régularité')).toBeTruthy();
    expect(screen.getByText('Soulève.')).toBeTruthy();
  });

  it('ProgressSegments expose sa progression', async () => {
    await render(<ProgressSegments count={6} progress={2.6} />);
    expect(screen.getByRole('progressbar')).toHaveAccessibilityValue({ min: 0, max: 6, now: 2 });
  });
});

describe('TabBar', () => {
  it('sélectionne un onglet et déclenche le +', async () => {
    const onSelect = jest.fn();
    const onCenterPress = jest.fn();
    await render(
      <TabBar
        items={[
          { key: 'home', label: fr.tabs.home, icon: House },
          { key: 'sessions', label: fr.tabs.sessions, icon: CalendarDays },
          { key: 'exercises', label: fr.tabs.exercises, icon: Dumbbell },
          { key: 'profile', label: fr.tabs.profile, icon: UserRound },
        ]}
        activeKey="home"
        onSelect={onSelect}
        onCenterPress={onCenterPress}
      />,
    );
    expect(screen.getByRole('tab', { name: fr.tabs.home })).toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: fr.tabs.profile }));
    await fireEvent.press(screen.getByRole('button', { name: fr.tabs.start }));
    expect(onSelect).toHaveBeenCalledWith('profile');
    expect(onCenterPress).toHaveBeenCalledTimes(1);
  });
});

function ToastTrigger() {
  const toast = useToast();
  return <Button label="Montrer" onPress={() => toast.show('Exercice enregistré')} />;
}

describe('Toast', () => {
  it('affiche puis masque le message', async () => {
    jest.useFakeTimers();
    await render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Montrer' }));
    expect(screen.getByText('Exercice enregistré')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.queryByText('Exercice enregistré')).toBeNull();
    jest.useRealTimers();
  });
});
