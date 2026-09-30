import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';
import { fr } from '@/i18n/fr';
import LoginScreen from '../../../../app/(auth)/login';

const mockSignIn = jest.fn();
const mockReset = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignIn(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockReset(...args),
    },
  },
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ setOnboardingPending: jest.fn() }),
}));

jest.mock('expo-linking', () => ({
  createURL: (path: string) => `surcharge://${path.replace(/^\//, '')}`,
}));

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  router: { replace: jest.fn(), push: jest.fn(), back: jest.fn() },
}));

const t = fr.auth.login;

async function renderLogin() {
  await render(
    <ToastProvider>
      <LoginScreen />
    </ToastProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

it('valide le formulaire avant d’appeler Supabase', async () => {
  await renderLogin();
  await fireEvent.press(screen.getByRole('button', { name: t.submit }));
  expect(await screen.findByText(fr.auth.validation.email)).toBeTruthy();
  expect(screen.getByText(fr.auth.validation.passwordRequired)).toBeTruthy();
  expect(mockSignIn).not.toHaveBeenCalled();
});

it('se connecte avec e-mail et mot de passe', async () => {
  mockSignIn.mockResolvedValue({ data: {}, error: null });
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText(t.email), 'johan@exemple.fr');
  await fireEvent.changeText(screen.getByLabelText(t.password), 'motdepasse');
  await fireEvent.press(screen.getByRole('button', { name: t.submit }));
  await waitFor(() =>
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'johan@exemple.fr', password: 'motdepasse' }),
  );
});

it('affiche l’erreur de Supabase en français', async () => {
  const { AuthApiError } = jest.requireActual('@supabase/supabase-js');
  mockSignIn.mockResolvedValue({
    data: {},
    error: new AuthApiError('x', 400, 'invalid_credentials'),
  });
  await renderLogin();
  await fireEvent.changeText(screen.getByLabelText(t.email), 'johan@exemple.fr');
  await fireEvent.changeText(screen.getByLabelText(t.password), 'mauvais');
  await fireEvent.press(screen.getByRole('button', { name: t.submit }));
  expect(await screen.findByText(fr.auth.errors.invalidCredentials)).toBeTruthy();
});

it('« Mot de passe oublié » demande l’e-mail puis envoie le lien', async () => {
  mockReset.mockResolvedValue({ data: {}, error: null });
  await renderLogin();
  await fireEvent.press(screen.getByRole('button', { name: t.forgot }));
  expect(await screen.findByText(t.resetNeedsEmail)).toBeTruthy();
  expect(mockReset).not.toHaveBeenCalled();

  await fireEvent.changeText(screen.getByLabelText(t.email), 'johan@exemple.fr');
  await fireEvent.press(screen.getByRole('button', { name: t.forgot }));
  expect(await screen.findByText(t.resetSent('johan@exemple.fr'))).toBeTruthy();
  expect(mockReset).toHaveBeenCalledWith('johan@exemple.fr', {
    redirectTo: 'surcharge://reset-password',
  });
});
