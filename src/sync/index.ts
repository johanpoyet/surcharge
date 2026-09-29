import { create } from 'zustand';

import type { AppDatabase } from '@/db/client';
import { downloadMissingPhotos, uploadPendingPhotos } from './photos';
import { pullAll } from './pull';
import { pushOutbox } from './push';
import { supabaseRemote, type RemoteApi } from './remote';

type SyncStatus = {
  syncing: boolean;
  /** Dernière synchro complète réussie (ms). */
  lastSuccessAt: number | null;
  /** Échecs consécutifs (espacement des nouvelles tentatives). */
  failures: number;
};

export const useSyncStatus = create<SyncStatus>(() => ({
  syncing: false,
  lastSuccessAt: null,
  failures: 0,
}));

let running: Promise<boolean> | null = null;

/**
 * Synchro complète (SPEC 7) : photos à envoyer, push de l'outbox, pull, photos à télécharger.
 * Un seul passage à la fois ; ne bloque jamais l'interface (les erreurs sont absorbées).
 */
export function runSync(
  db: AppDatabase,
  userId: string,
  remote: RemoteApi = supabaseRemote,
): Promise<boolean> {
  if (running) return running;
  useSyncStatus.setState({ syncing: true });
  running = (async () => {
    try {
      await uploadPendingPhotos(db, userId).catch(() => 0);
      const pushed = await pushOutbox(db, remote, userId);
      await pullAll(db, remote, userId);
      await downloadMissingPhotos(db, userId).catch(() => 0);
      return pushed.failed === 0;
    } catch {
      return false;
    }
  })().then((ok) => {
    useSyncStatus.setState((s) => ({
      syncing: false,
      lastSuccessAt: ok ? Date.now() : s.lastSuccessAt,
      failures: ok ? 0 : s.failures + 1,
    }));
    running = null;
    return ok;
  });
  return running;
}

// Demandes de synchro venues de l'app (fin de séance…), traitées par le hook useSync.
let listener: (() => void) | null = null;
export const onSyncRequest = (callback: (() => void) | null) => {
  listener = callback;
};
export const requestSync = () => listener?.();
