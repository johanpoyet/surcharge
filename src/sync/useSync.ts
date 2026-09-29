import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { onSyncRequest, runSync, useSyncStatus } from './index';
import { pendingCount } from './outbox';

const INTERVAL_MS = 60_000;
const MAX_BACKOFF_MS = 15 * 60_000;

/**
 * Déclencheurs de la synchro (SPEC 7) : connexion / démarrage, retour du réseau, retour de l'app
 * au premier plan, demande explicite (fin de séance), et toutes les 60 s s'il reste des
 * modifications en attente (espacé après des échecs).
 */
export function useSync(): void {
  const userId = useAuth().session?.user.id;
  const lastAttempt = useRef(0);

  useEffect(() => {
    if (!userId) return;
    const sync = () => {
      lastAttempt.current = Date.now();
      void runSync(db, userId);
    };
    sync();

    onSyncRequest(sync);
    let wasOffline = false;
    const unsubscribeNet = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      if (online && wasOffline) sync();
      wasOffline = !online;
    });
    const appState = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync();
    });
    const timer = setInterval(() => {
      const { failures } = useSyncStatus.getState();
      const wait = Math.min(MAX_BACKOFF_MS, INTERVAL_MS * 2 ** failures);
      if (pendingCount(db) > 0 && Date.now() - lastAttempt.current >= wait) sync();
    }, INTERVAL_MS);

    return () => {
      onSyncRequest(null);
      unsubscribeNet();
      appState.remove();
      clearInterval(timer);
    };
  }, [userId]);
}
