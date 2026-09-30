import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ToastProvider } from '@/components/ui';
import { fr } from '@/i18n/fr';
import { SocialButtons } from '../components/SocialButtons';

const mockReplace = jest.fn();
const mockSetPending = jest.fn();
const mockGoogle = jest.fn();

jest.mock('expo-router', () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
}));
jest.mock('expo-apple-authentication', () => ({}));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ setOnboardingPending: mockSetPending }),
}));
jest.mock('../social', () => ({
  appleSignInAvailable: () => Promise.resolve(false),
  signInWithApple: jest.fn(),
  signInWithGoogle: () => mockGoogle(),
  SignInCanceledError: class extends Error {},
}));

async function pressGoogle() {
  await render(
    <ToastProvider>
      <SocialButtons />
    </ToastProvider>,
  );
  await fireEvent.press(screen.getByRole('button', { name: fr.auth.social.googleA11y }));
}

beforeEach(() => jest.clearAllMocks());

it('nouveau compte : direction l’onboarding (bibliothèque d’exercices à la fin)', async () => {
  mockGoogle.mockResolvedValue({ isNew: true });
  await pressGoogle();
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/onboarding'));
  expect(mockSetPending).toHaveBeenCalledWith(true);
  expect(mockSetPending).not.toHaveBeenCalledWith(false);
});

it('compte existant : pas d’onboarding', async () => {
  mockGoogle.mockResolvedValue({ isNew: false });
  await pressGoogle();
  await waitFor(() => expect(mockSetPending).toHaveBeenLastCalledWith(false));
  expect(mockReplace).not.toHaveBeenCalled();
});
