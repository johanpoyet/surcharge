import { inviteUrl, parseInviteCode } from '../invite';

it('lien d’invitation et lecture du code depuis un lien, un QR ou une saisie', () => {
  expect(inviteUrl('JOHAN-7K2')).toBe('https://johanpoyet.fr/s/JOHAN-7K2');
  expect(parseInviteCode('https://johanpoyet.fr/s/JOHAN-7K2')).toBe('JOHAN-7K2');
  expect(parseInviteCode('surcharge://add/elodie-rhk')).toBe('ELODIE-RHK');
  expect(parseInviteCode(' johan-7k2 ')).toBe('JOHAN-7K2');
  expect(parseInviteCode('https://example.com')).toBeNull();
  expect(parseInviteCode('elo_run')).toBeNull();
});
