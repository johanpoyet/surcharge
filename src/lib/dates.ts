import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { fr as frLocale } from 'date-fns/locale';

import { fr } from '@/i18n/fr';

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

/** « aujourd'hui », « hier » ou « 25 sept. » (liste des exercices). */
export function formatRelativeDay(iso: string, now = new Date()): string {
  const date = parseISO(iso);
  if (isToday(date) && date <= now) return fr.exercises.today;
  if (isYesterday(date)) return fr.exercises.yesterday;
  return format(date, 'd MMM', { locale: frLocale });
}

/** « Lun. 28 sept. » (historique, en-têtes). */
export function formatSessionDay(iso: string): string {
  return capitalize(format(parseISO(iso), 'EEE d MMM', { locale: frLocale }));
}

/** « 28 sept. » */
export function formatShortDay(iso: string): string {
  return format(parseISO(iso), 'd MMM', { locale: frLocale });
}

/** « juil. » (« depuis juil. »). */
export function formatMonth(iso: string): string {
  return format(parseISO(iso), 'MMM', { locale: frLocale });
}
