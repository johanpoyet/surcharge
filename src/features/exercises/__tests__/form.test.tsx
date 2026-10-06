import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { ExerciseForm } from '../components/ExerciseForm';

jest.mock('../photos', () => ({
  pickExercisePhoto: jest.fn(),
  deleteLocalPhoto: jest.fn(),
  PhotoPermissionError: class extends Error {},
}));

const t = fr.exercises.form;

async function renderForm(onSubmit = jest.fn(), unit: 'kg' | 'lb' = 'kg') {
  await render(
    <ToastProvider>
      <ExerciseForm mode="create" unit={unit} onSubmit={onSubmit} onCancel={jest.fn()} />
    </ToastProvider>,
  );
  return onSubmit;
}

it('exige un nom, un muscle et un équipement', async () => {
  const onSubmit = await renderForm();
  await fireEvent.press(screen.getByRole('button', { name: t.create }));
  expect(await screen.findByText(t.nameRequired)).toBeTruthy();
  expect(screen.getByText(t.muscleRequired)).toBeTruthy();
  expect(screen.getByText(t.equipmentRequired)).toBeTruthy();
  expect(onSubmit).not.toHaveBeenCalled();
});

it('crée « Presse à cuisses 45° » avec un pas de 5 kg sur machine', async () => {
  const onSubmit = await renderForm();
  await fireEvent.changeText(screen.getByLabelText(t.name), 'Presse à cuisses 45°');
  await fireEvent.press(screen.getByText('Jambes'));
  await fireEvent.press(screen.getByText('Machine'));
  await fireEvent.press(screen.getByRole('button', { name: t.create }));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Presse à cuisses 45°',
      muscle: 'legs',
      equipment: 'machine',
      weightStepKg: 5,
      note: null,
      photoLocalUri: null,
      trackingType: 'weight_reps',
      discipline: 'strength',
    }),
  );
});

const tt = fr.exercises.tracking;

it('crée « Fractionné 400 m » en distance + temps : pas de pas de charge', async () => {
  const onSubmit = await renderForm();
  await fireEvent.changeText(screen.getByLabelText(t.name), 'Fractionné 400 m');
  await fireEvent.press(screen.getByText(tt.types.distance_time.title));
  expect(screen.queryByText(t.step)).toBeNull();
  // Discipline Course : muscle et équipement « Autre » par défaut.
  await fireEvent.press(screen.getByText(tt.disciplines.running));
  await fireEvent.press(screen.getByRole('button', { name: t.create }));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Fractionné 400 m',
        trackingType: 'distance_time',
        discipline: 'running',
        muscle: 'other',
        equipment: 'other',
      }),
    ),
  );
});

it('type de suivi verrouillé si l’exercice a déjà des séries', async () => {
  await render(
    <ToastProvider>
      <ExerciseForm
        mode="edit"
        unit="kg"
        trackingLocked
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      />
    </ToastProvider>,
  );
  expect(screen.getByText(tt.locked)).toBeTruthy();
  expect(
    screen.getByRole('radio', { name: new RegExp(tt.types.time.title) }).props.accessibilityState,
  ).toMatchObject({ disabled: true });
});

it('un pas choisi à la main ne suit plus l’équipement', async () => {
  const onSubmit = await renderForm();
  await fireEvent.changeText(screen.getByLabelText(t.name), 'Curl');
  await fireEvent.press(screen.getByText('Bras'));
  await fireEvent.press(screen.getByText('Haltères'));
  await fireEvent.press(screen.getByRole('button', { name: 'Retirer 0,5 kg' }));
  await fireEvent.press(screen.getByText('Machine'));
  await fireEvent.press(screen.getByRole('button', { name: t.create }));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weightStepKg: 2 })),
  );
});

it('en lb, le pas est affiché en lb et enregistré en kg', async () => {
  const onSubmit = await renderForm(jest.fn(), 'lb');
  await fireEvent.changeText(screen.getByLabelText(t.name), 'Presse');
  await fireEvent.press(screen.getByText('Jambes'));
  await fireEvent.press(screen.getByText('Machine'));
  expect(screen.getByText('11 lb')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.create }));
  await waitFor(() =>
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ weightStepKg: 4.99 })),
  );
});
