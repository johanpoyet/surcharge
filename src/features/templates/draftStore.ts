import { create } from 'zustand';

import type { BlockType, JsonObject, TrackingType } from '@/db/schema';
import { newId } from '@/lib/id';
import { DEFAULT_CONFIGS, toJson } from './blockConfig';
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
  /** Cibles des types de suivi V2 (cardio, circuit). */
  targetDistanceM: number | null;
  targetDurationS: number | null;
  targetCalories: number | null;
  targetWeightKg: number | null;
};

export type DraftBlock = {
  key: string;
  id?: string;
  type: BlockType;
  name: string | null;
  config: JsonObject;
  items: DraftItem[];
};

type ItemInit = Omit<DraftItem, 'key'>;
export type PickedExercise = { exerciseId: string; tracking: TrackingType };
export type DraftInit = {
  templateId?: string;
  name: string;
  weekdays: number[];
  blocks: (Omit<DraftBlock, 'key' | 'items'> & { items: ItemInit[] })[];
};

type DraftState = {
  templateId?: string;
  name: string;
  weekdays: number[];
  blocks: DraftBlock[];
  /** Modifié depuis le chargement (confirmation à l'annulation). */
  dirty: boolean;
  /** Bloc qui recevra les exercices choisis dans « choisir des exercices ». */
  pickBlockKey: string | null;
  load: (init: DraftInit) => void;
  setName: (name: string) => void;
  toggleWeekday: (weekday: number) => void;
  /** Ajoute un bloc à la fin et retourne sa clé. */
  addBlock: (type: BlockType) => string;
  updateBlock: (key: string, patch: Partial<Pick<DraftBlock, 'name' | 'config'>>) => void;
  removeBlock: (key: string) => void;
  moveBlock: (from: number, to: number) => void;
  duplicateBlock: (key: string) => void;
  setPickTarget: (blockKey: string) => void;
  /**
   * Ajoute les exercices choisis au bloc cible. Un bloc Musculation ne note que charge × reps :
   * les exercices suivis autrement (course, gainage, calories…) vont dans le bloc Course / cardio
   * qui le suit, créé au besoin.
   */
  addExercises: (picked: readonly PickedExercise[], restSeconds: number) => void;
  updateItem: (key: string, patch: Partial<ItemInit>) => void;
  removeItem: (key: string) => void;
  moveItem: (blockKey: string, from: number, to: number) => void;
};

// Valeurs par défaut d'un exercice de musculation ajouté : 3 séries de 8 à 12 reps.
const DEFAULT_SETS = 3;
const DEFAULT_REPS = formatRepsTarget({ min: 8, max: 12 });

const noTargets = {
  targetDistanceM: null,
  targetDurationS: null,
  targetCalories: null,
  targetWeightKg: null,
};

/**
 * Cibles d'un exercice ajouté à un bloc, selon le type de bloc et ce que l'on note pour cet
 * exercice : 3 × 8–12 en musculation, une série de 1 km en course, 10 reps par tour en circuit…
 */
export function defaultItem(
  blockType: BlockType,
  exerciseId: string,
  tracking: TrackingType,
  restSeconds: number,
): ItemInit {
  const base: ItemInit = {
    exerciseId,
    targetSets: DEFAULT_SETS,
    repsText: DEFAULT_REPS,
    restText: formatRest(restSeconds),
    ...noTargets,
  };
  if (blockType === 'strength') return base;
  const circuit = blockType === 'circuit';
  const item: ItemInit = {
    ...base,
    targetSets: 1,
    repsText: '',
    restText: formatRest(circuit ? 0 : 90),
  };
  switch (tracking) {
    case 'weight_reps':
    case 'reps':
      return { ...item, repsText: '10' };
    case 'distance_time':
      return { ...item, targetDistanceM: circuit ? 200 : 1000 };
    case 'time':
      return { ...item, targetDurationS: circuit ? 30 : 300 };
    case 'calories':
      return { ...item, targetCalories: circuit ? 10 : 20 };
    case 'weight_distance':
      return { ...item, targetDistanceM: circuit ? 100 : 200 };
  }
}

/** Types de suivi qu'un bloc Musculation sait afficher et noter (charge × reps, reps seules). */
export const fitsStrengthBlock = (tracking: TrackingType): boolean =>
  tracking === 'weight_reps' || tracking === 'reps';

const withKeys = (items: readonly ItemInit[]): DraftItem[] =>
  items.map((item) => ({ ...item, key: item.id ?? newId() }));

const mapBlock = (
  blocks: DraftBlock[],
  key: string,
  update: (block: DraftBlock) => DraftBlock,
): DraftBlock[] => blocks.map((block) => (block.key === key ? update(block) : block));

function move<T>(list: readonly T[], from: number, to: number): T[] | null {
  if (from === to || to < 0 || to >= list.length) return null;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  if (moved !== undefined) next.splice(to, 0, moved);
  return next;
}

/** Séance type en cours d'édition, partagée entre l'éditeur, les éditeurs de bloc et le choix des exercices. */
export const useTemplateDraft = create<DraftState>((set) => ({
  name: '',
  weekdays: [],
  blocks: [],
  dirty: false,
  pickBlockKey: null,
  load: (init) =>
    set({
      templateId: init.templateId,
      name: init.name,
      weekdays: [...init.weekdays].sort((a, b) => a - b),
      blocks: init.blocks.map((block) => ({
        ...block,
        key: block.id ?? newId(),
        items: withKeys(block.items),
      })),
      dirty: false,
      pickBlockKey: null,
    }),
  setName: (name) => set({ name, dirty: true }),
  toggleWeekday: (weekday) =>
    set((state) => ({
      weekdays: state.weekdays.includes(weekday)
        ? state.weekdays.filter((d) => d !== weekday)
        : [...state.weekdays, weekday].sort((a, b) => a - b),
      dirty: true,
    })),
  addBlock: (type) => {
    const key = newId();
    set((state) => ({
      blocks: [
        ...state.blocks,
        { key, type, name: null, config: toJson(DEFAULT_CONFIGS[type]), items: [] },
      ],
      dirty: true,
    }));
    return key;
  },
  updateBlock: (key, patch) =>
    set((state) => ({
      blocks: mapBlock(state.blocks, key, (block) => ({ ...block, ...patch })),
      dirty: true,
    })),
  removeBlock: (key) =>
    set((state) => ({ blocks: state.blocks.filter((block) => block.key !== key), dirty: true })),
  moveBlock: (from, to) =>
    set((state) => {
      const blocks = move(state.blocks, from, to);
      return blocks ? { blocks, dirty: true } : state;
    }),
  duplicateBlock: (key) =>
    set((state) => {
      const index = state.blocks.findIndex((block) => block.key === key);
      const source = state.blocks[index];
      if (!source) return state;
      // Copie sans ids : un nouveau bloc et de nouvelles lignes à l'enregistrement.
      const copy: DraftBlock = {
        key: newId(),
        type: source.type,
        name: source.name,
        config: { ...source.config },
        items: source.items.map(({ id: _id, ...item }) => ({ ...item, key: newId() })),
      };
      const blocks = [...state.blocks];
      blocks.splice(index + 1, 0, copy);
      return { blocks, dirty: true };
    }),
  setPickTarget: (blockKey) => set({ pickBlockKey: blockKey }),
  addExercises: (picked, restSeconds) =>
    set((state) => {
      const targetKey = state.pickBlockKey ?? state.blocks[0]?.key;
      const index = state.blocks.findIndex((block) => block.key === targetKey);
      const target = state.blocks[index];
      if (!target) return state;
      const itemsFor = (type: BlockType, list: readonly PickedExercise[]) =>
        withKeys(list.map((p) => defaultItem(type, p.exerciseId, p.tracking, restSeconds)));
      const strength = target.type === 'strength';
      const kept = strength ? picked.filter((p) => fitsStrengthBlock(p.tracking)) : picked;
      const moved = strength ? picked.filter((p) => !fitsStrengthBlock(p.tracking)) : [];
      const blocks = [...state.blocks];
      blocks[index] = { ...target, items: [...target.items, ...itemsFor(target.type, kept)] };
      if (moved.length > 0) {
        const next = blocks[index + 1];
        if (next?.type === 'cardio') {
          blocks[index + 1] = { ...next, items: [...next.items, ...itemsFor('cardio', moved)] };
        } else {
          blocks.splice(index + 1, 0, {
            key: newId(),
            type: 'cardio',
            name: null,
            config: toJson(DEFAULT_CONFIGS.cardio),
            items: itemsFor('cardio', moved),
          });
        }
      }
      return { blocks, dirty: true };
    }),
  updateItem: (key, patch) =>
    set((state) => ({
      blocks: state.blocks.map((block) => ({
        ...block,
        items: block.items.map((item) => (item.key === key ? { ...item, ...patch } : item)),
      })),
      dirty: true,
    })),
  removeItem: (key) =>
    set((state) => ({
      blocks: state.blocks.map((block) => ({
        ...block,
        items: block.items.filter((item) => item.key !== key),
      })),
      dirty: true,
    })),
  moveItem: (blockKey, from, to) =>
    set((state) => {
      const block = state.blocks.find((b) => b.key === blockKey);
      const items = block ? move(block.items, from, to) : null;
      if (!items) return state;
      return { blocks: mapBlock(state.blocks, blockKey, (b) => ({ ...b, items })), dirty: true };
    }),
}));
