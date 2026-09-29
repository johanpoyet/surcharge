/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

type Override = { templateId: string | null };
type WeeklyEntry = { templateId: string };

/**
 * Séance du jour (SPEC 9.1) : une exception à la date prime (null = repos forcé),
 * sinon le modèle de semaine, sinon repos.
 */
export function resolveTemplateId(
  override: Override | undefined,
  weekly: WeeklyEntry | undefined,
): string | null {
  if (override) return override.templateId;
  return weekly?.templateId ?? null;
}
