import { format, parseISO } from 'date-fns';

import type { Difficulty } from '@/features/workout/difficulty';
import { fr } from '@/i18n/fr';

export type CsvRow = {
  startedAt: string;
  sessionName: string;
  exerciseName: string;
  exerciseOrder: number;
  setNumber: number;
  weightKg: number;
  reps: number;
  difficulty: Difficulty | null;
};

// Séparateur « ; » et virgule décimale : ouverture directe dans Excel / Numbers en français.
const SEPARATOR = ';';
const escape = (value: string) => (/[";\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
const decimal = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',');

/** Export des séances et séries (SPEC 11). BOM UTF-8 pour les accents dans Excel. */
export function buildCsv(rows: readonly CsvRow[]): string {
  const header = fr.profile.csv.columns.join(SEPARATOR);
  const lines = rows.map((row) =>
    [
      format(parseISO(row.startedAt), 'yyyy-MM-dd'),
      format(parseISO(row.startedAt), 'HH:mm'),
      escape(row.sessionName),
      escape(row.exerciseName),
      String(row.exerciseOrder + 1),
      String(row.setNumber),
      decimal(row.weightKg),
      String(row.reps),
      row.difficulty ? fr.difficulty[row.difficulty] : '',
    ].join(SEPARATOR),
  );
  return `﻿${[header, ...lines].join('\n')}\n`;
}
