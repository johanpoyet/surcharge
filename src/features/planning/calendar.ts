// Calendrier du planning (lundi en premier) et résolution de la séance de chaque jour (SPEC 9.1).

import { toLocalDateString } from '@/lib/format';
import { isoWeekday } from './resolve';

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Lundi de la semaine de `date` (à minuit, heure locale). */
export function startOfWeek(date: Date): Date {
  return addDays(date, 1 - isoWeekday(date));
}

export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Grille du mois en semaines complètes (lundi → dimanche), jours des mois voisins compris. */
export function monthGrid(year: number, month: number): Date[][] {
  const first = startOfWeek(new Date(year, month, 1));
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  for (let start = first; start <= last; start = addDays(start, 7)) weeks.push(weekDays(start));
  return weeks;
}

export type DayPlanSource = 'override' | 'weekly' | 'none';
export type DayPlan = { date: string; templateId: string | null; source: DayPlanSource };

/** Séance prévue un jour : exception à la date (null = repos forcé) > modèle de semaine > repos. */
export function planForDay(
  date: Date,
  overrides: ReadonlyMap<string, string | null>,
  weekly: ReadonlyMap<number, string>,
): DayPlan {
  const key = toLocalDateString(date);
  if (overrides.has(key))
    return { date: key, templateId: overrides.get(key) ?? null, source: 'override' };
  const templateId = weekly.get(isoWeekday(date)) ?? null;
  return { date: key, templateId, source: templateId ? 'weekly' : 'none' };
}

/** Nombre de séances prévues par séance type sur des jours donnés. */
export function countPlanned(plans: readonly DayPlan[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const plan of plans) {
    if (plan.templateId) counts.set(plan.templateId, (counts.get(plan.templateId) ?? 0) + 1);
  }
  return counts;
}

/** Étiquette de la vue mois : nom en majuscules, 6 caractères max. (« PUSH A » → « PUSH A »). */
export function monthLabel(name: string): string {
  return name.trim().toUpperCase().slice(0, 6).trim();
}
