import type { AppDatabase } from '@/db/client';
import { supabase } from '@/lib/supabase';
import { clearLocalData } from './localData';

/**
 * Supprime le compte (SPEC 11) : l'Edge Function efface les photos puis l'utilisateur (cascade
 * sur toutes ses données) ; l'app vide ensuite sa base locale et ses photos, puis se déconnecte.
 */
export async function deleteAccount(db: AppDatabase): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  clearLocalData(db);
  // Le compte n'existe plus côté serveur : déconnexion locale uniquement.
  await supabase.auth.signOut({ scope: 'local' });
}
