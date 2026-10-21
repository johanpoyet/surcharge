import { create } from 'zustand';

/** Sous-onglet de l'onglet Entraînement (SPEC_V2 §5.5), choisi aussi depuis d'autres écrans. */
export type TrainingTab = 'planning' | 'templates' | 'exercises';

export const useTrainingTab = create<{ tab: TrainingTab; setTab: (tab: TrainingTab) => void }>(
  (set) => ({ tab: 'planning', setTab: (tab) => set({ tab }) }),
);
