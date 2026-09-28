import { render, screen } from '@testing-library/react-native';

import SetupScreen from '../../app/index';
import { fr } from '@/i18n/fr';

it("affiche l'écran d'accueil temporaire", async () => {
  await render(<SetupScreen />);
  expect(screen.getByText(fr.dev.setupSubtitle)).toBeTruthy();
  expect(screen.getByText('Soulève.')).toBeTruthy();
});
