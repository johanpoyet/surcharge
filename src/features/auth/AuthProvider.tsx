import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  /** Vrai tant que la session enregistrée n'a pas été relue au démarrage. */
  initializing: boolean;
  /** Vrai entre l'inscription et la fin (ou le saut) de l'onboarding. */
  onboardingPending: boolean;
  setOnboardingPending: (pending: boolean) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [onboardingPending, setOnboardingPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setSession(data.session);
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next) setOnboardingPending(false);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({ session, initializing, onboardingPending, setOnboardingPending }),
    [session, initializing, onboardingPending],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return context;
}
