import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect } from 'react';

// Bips générés pour l'app (aucun droit d'auteur) : changement d'intervalle et fin de bloc.
const BEEP = require('../../../../assets/sounds/beep.wav');
const END = require('../../../../assets/sounds/end.wav');

/**
 * Signal sonore et haptique des blocs minutés (EMOM, Tabata, fin d'AMRAP). Joue même en mode
 * silencieux, mélangé à la musique en cours. En arrière-plan, ce sont les notifications qui sonnent.
 */
export function useSignalSound(): (kind: 'beep' | 'end') => void {
  const beep = useAudioPlayer(BEEP);
  const end = useAudioPlayer(END);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(
      () => undefined,
    );
  }, []);

  return useCallback(
    (kind) => {
      const player = kind === 'end' ? end : beep;
      try {
        void player.seekTo(0);
        player.play();
      } catch {
        // Son indisponible : la vibration suffit.
      }
      void Haptics.notificationAsync(
        kind === 'end'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
    },
    [beep, end],
  );
}
