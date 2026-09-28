import { render, screen } from '@testing-library/react-native';

import SetupScreen from '../../app/index';
import { fr } from '@/i18n/fr';

it("affiche l'écran de test de la Phase 0", async () => {
  await render(<SetupScreen />);
  expect(screen.getByText(fr.dev.setupSubtitle)).toBeTruthy();
});
