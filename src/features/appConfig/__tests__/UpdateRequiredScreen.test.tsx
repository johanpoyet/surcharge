import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { config } from '@/config';
import { fr } from '@/i18n/fr';

import { UpdateRequiredScreen } from '../UpdateRequiredScreen';

describe('UpdateRequiredScreen', () => {
  it('renvoie vers la fiche App Store', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<UpdateRequiredScreen />);
    expect(screen.getByText(fr.forceUpdate.body)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: fr.forceUpdate.button }));
    expect(openURL).toHaveBeenCalledWith(config.appStoreUrl);
  });
});
