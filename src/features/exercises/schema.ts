import { z } from 'zod';

import { fr } from '@/i18n/fr';
import { EQUIPMENTS, MUSCLES } from './labels';

const t = fr.exercises.form;

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, { message: t.nameRequired }).max(60, { message: t.nameRequired }),
  muscle: z.enum(MUSCLES as [string, ...string[]], { message: t.muscleRequired }),
  equipment: z.enum(EQUIPMENTS as [string, ...string[]], { message: t.equipmentRequired }),
  /** Dans l'unité affichée (kg ou lb) ; converti en kg à l'enregistrement. */
  weightStep: z.number().positive(),
  note: z.string().trim().max(200),
  photoLocalUri: z.string().nullable(),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
