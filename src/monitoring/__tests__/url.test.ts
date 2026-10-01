import { stripQuery } from '../url';

it('retire les paramètres des adresses', () => {
  expect(stripQuery('https://x.supabase.co/rest/v1/sets?user_id=eq.abc&select=*')).toBe(
    'https://x.supabase.co/rest/v1/sets',
  );
  expect(stripQuery('https://x.supabase.co/auth/v1/token#access')).toBe(
    'https://x.supabase.co/auth/v1/token',
  );
  expect(stripQuery('https://x.supabase.co/rest/v1/sets')).toBe(
    'https://x.supabase.co/rest/v1/sets',
  );
});
