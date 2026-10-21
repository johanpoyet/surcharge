import { create } from 'zustand';

/** Code ami lu par le scanner, repris par l'écran « Ajouter un ami » au retour. */
export const useScannedCode = create<{ code: string | null }>(() => ({ code: null }));
