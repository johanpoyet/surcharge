import { create } from 'zustand';

import { newId } from '@/lib/id';
import { formatRepsTarget, formatRest } from './format';

/** Ligne en cours d'édition : reps et repos gardés en texte tant que la saisie n'est pas validée. */
export type DraftItem = {
  /** Clé stable pour l'affichage (la ligne peut ne pas encore exister en base). */
  key: string;
  id?: string;
  exerciseId: string;
  targetSets: number;
  repsText: string;
  restText: string;
};

export type DraftInit = {
  templateId?: string;
  name: string;
  weekdays: number[];
  items: Omit<DraftItem, 'key'>[];
};

type DraftState = {
  templateId?: string;
  name: string;
  weekdays: number[];
  items: DraftItem[];
  /** Modifié depuis le chargement (confirmation à l'annulation). */
  dirty: boolean;
  load: (init: DraftInit) => void;
  setName: (name: string) => void;
  toggleWeekday: (weekday: number) => void;
  addExercises: (exerciseIds: readonly string[], restSeconds: number) => void;
  updateItem: (key: string, patch: Partial<Omit<DraftItem, 'key'>>) => void;
  removeItem: (key: string) => void;
  moveItem: (from: number, to: number) => void;
};

// Valeurs par défaut d'un exercice ajouté : 3 séries de 8 à 12 reps.
const DEFAULT_SETS = 3;
const DEFAULT_REPS = formatRepsTarget({ min: 8, max: 12 });

/** Séance type en cours d'édition, partagée entre l'éditeur et l'écran de choix des exercices. */
export const useTemplateDraft = create<DraftState>((set) => ({
  name: '',
  weekdays: [],
  items: [],
  dirty: false,
  load: (init) =>
    set({
      templateId: init.templateId,
      name: init.name,
      weekdays: [...init.weekdays].sort((a, b) => a - b),
      items: init.items.map((item) => ({ ...item, key: item.id ?? newId() })),
      dirty: false,
    }),
  setName: (name) => set({ name, dirty: true }),
  toggleWeekday: (weekday) =>
    set((state) => ({
      weekdays: state.weekdays.includes(weekday)
        ? state.weekdays.filter((d) => d !== weekday)
        : [...state.weekdays, weekday].sort((a, b) => a - b),
      dirty: true,
    })),
  addExercises: (exerciseIds, restSeconds) =>
    set((state) => ({
      items: [
        ...state.items,
        ...exerciseIds.map((exerciseId) => ({
          key: newId(),
          exerciseId,
          targetSets: DEFAULT_SETS,
          repsText: DEFAULT_REPS,
          restText: formatRest(restSeconds),
        })),
      ],
      dirty: true,
    })),
  updateItem: (key, patch) =>
    set((state) => ({
      items: state.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      dirty: true,
    })),
  removeItem: (key) =>
    set((state) => ({ items: state.items.filter((item) => item.key !== key), dirty: true })),
  moveItem: (from, to) =>
    set((state) => {
      if (from === to || to < 0 || to >= state.items.length) return state;
      const items = [...state.items];
      const [moved] = items.splice(from, 1);
      if (moved) items.splice(to, 0, moved);
      return { items, dirty: true };
    }),
}));
