import * as Application from 'expo-application';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';

import { isUpdateRequired } from './version';

/**
 * Version minimale exigée (`app_config.min_supported_version`), relue au démarrage et à chaque
 * retour au premier plan. Hors ligne ou en cas d'erreur, on ne bloque jamais (SPEC_V2, Phase A).
 */
export function useUpdateRequired(): boolean {
  const [required, setRequired] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'min_supported_version')
        .maybeSingle();
      if (cancelled) return;
      setRequired(!error && isUpdateRequired(Application.nativeApplicationVersion, data?.value));
    }

    void check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return required;
}
