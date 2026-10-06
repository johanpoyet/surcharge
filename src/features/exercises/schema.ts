import { z } from 'zod';

import type { Discipline, TrackingType } from '@/db/schema';
import { fr } from '@/i18n/fr';
import { DISCIPLINES, EQUIPMENTS, MUSCLES } from './labels';
import { TRACKING_TYPES } from './tracking';

const t = fr.exercises.form;

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, { message: t.nameRequired }).max(60, { message: t.nameRequired }),
  muscle: z.enum(MUSCLES as [string, ...string[]], { message: t.muscleRequired }),
  equipment: z.enum(EQUIPMENTS as [string, ...string[]], { message: t.equipmentRequired }),
  /** Dans l'unité affichée (kg ou lb) ; converti en kg à l'enregistrement. */
  weightStep: z.number().positive(),
  note: z.string().trim().max(200),
  photoLocalUri: z.string().nullable(),
  trackingType: z.enum(TRACKING_TYPES as [TrackingType, ...TrackingType[]]),
  discipline: z.enum(DISCIPLINES as [Discipline, ...Discipline[]]),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
