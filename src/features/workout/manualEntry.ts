// Saisie à la main d'une sortie ou d'un temps (retours des testeurs : pas de téléphone pendant la
// course). Fonctions pures, testées unitairement.

import type { Discipline } from '@/db/schema';
import { paceSecondsPerKm } from '@/features/exercises/tracking';

/**
 * Durée tapée à la main, en secondes : « 58:30 », « 1:05:20 », « 1h05 », « 45 » (minutes).
 * Null si la saisie n'est pas une durée valide.
 */
export function parseDuration(text: string): number | null {
  const clean = text.trim().toLowerCase().replace(/\s/g, '');
  let seconds: number;
  const hours = /^(\d+)h(\d{1,2})?(?::(\d{1,2}))?$/.exec(clean);
  if (hours) {
    const [h = 0, m = 0, s = 0] = hours.slice(1).map((p) => Number(p ?? 0));
    if (m >= 60 || s >= 60) return null;
    seconds = h * 3600 + m * 60 + s;
  } else {
    const normalized = clean.replace(/['’]/g, ':').replace(/:$/, '');
    if (!/^\d+(:\d{1,2}){0,2}$/.test(normalized)) return null;
    const parts = normalized.split(':').map(Number);
    if (parts.slice(1).some((p) => p >= 60)) return null;
    const [a = 0, b = 0, c = 0] = parts;
    seconds = parts.length === 1 ? a * 60 : parts.length === 2 ? a * 60 + b : a * 3600 + b * 60 + c;
  }
  return seconds > 0 && seconds < 48 * 3600 ? seconds : null;
}

/** Distance tapée en kilomètres (« 12 », « 12,5 », « 0.4 »), en mètres ; null si invalide. */
export function parseKm(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(clean)) return null;
  const meters = Math.round(Number(clean) * 1000);
  return meters > 0 && meters <= 1_000_000 ? meters : null;
}

/** « 12,5 » pour une saisie de 12 500 m (champ texte prérempli). */
export const kmText = (meters: number): string =>
  String(Math.round(meters) / 1000).replace('.', ',');

/**
 * Allure la plus rapide jugée possible (secondes par km) : 2:00 /km en course (record du monde du
 * marathon vers 2:50), 0:40 /km pour le reste (vélo à 90 km/h).
 */
export const fastestPace = (discipline: Discipline | null | undefined): number =>
  discipline === 'running' ? 120 : 40;

/** Vrai si l'allure est trop rapide pour être réelle (faute de frappe, chrono oublié). */
export function isImplausiblePace(
  distanceM: number | null,
  durationS: number | null,
  discipline: Discipline | null | undefined,
): boolean {
  const pace = paceSecondsPerKm(distanceM, durationS);
  return pace !== null && pace < fastestPace(discipline);
}

/**
 * Début et fin d'une sortie notée après coup. Aujourd'hui : elle vient de se terminer. Un autre
 * jour : on la place à midi (l'heure exacte importe peu, le jour compte pour les stats).
 */
export function activityTimes(
  day: Date,
  durationS: number,
  now: Date,
): { startedAt: string; endedAt: string } {
  const sameDay = day.toDateString() === now.toDateString();
  const end = sameDay ? now.getTime() : new Date(day).setHours(12, 0, 0, 0) + durationS * 1000;
  return {
    startedAt: new Date(end - durationS * 1000).toISOString(),
    endedAt: new Date(end).toISOString(),
  };
}
