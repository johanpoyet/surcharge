import { isNewAccount } from '../social';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('expo-apple-authentication', () => ({}));
jest.mock('@react-native-google-signin/google-signin', () => ({}));
jest.mock('expo-constants', () => ({ expoConfig: {} }));

it('nouveau compte : première connexion au moment de la création', () => {
  expect(
    isNewAccount({ created_at: '2026-09-30T10:00:00Z', last_sign_in_at: '2026-09-30T10:00:01Z' }),
  ).toBe(true);
  expect(isNewAccount({ created_at: '2026-09-30T10:00:00Z', last_sign_in_at: null })).toBe(true);
  expect(
    isNewAccount({ created_at: '2026-09-01T10:00:00Z', last_sign_in_at: '2026-09-30T10:00:00Z' }),
  ).toBe(false);
});
