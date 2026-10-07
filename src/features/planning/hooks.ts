import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { liveDb } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { templateSummary } from '@/features/templates/blockSummary';
import { estimateTemplate } from '@/features/templates/estimate';
import { useTemplateBlocks, useTemplateItems, useTemplates } from '@/features/templates/hooks';
import { weeklyScheduleQuery } from '@/features/templates/repository';
import { fr } from '@/i18n/fr';
import { overridesQuery } from './repository';

export type TemplateInfo = {
  id: string;
  name: string;
  exerciseCount: number;
  minutes: number;
  muscles: string[];
  /** Résumé des blocs (séance multi-sport), null pour une séance de musculation seule. */
  summary: string | null;
};

/** Modèle de semaine, exceptions et infos des séances types, en direct. */
export function usePlanning() {
  const userId = useAuth().session?.user.id ?? '';
  const { data: weeklyRows } = useLiveQuery(weeklyScheduleQuery(liveDb, userId), [userId]);
  const { data: overrideRows } = useLiveQuery(overridesQuery(liveDb, userId), [userId]);
  const templates = useTemplates();
  const items = useTemplateItems();
  const blocks = useTemplateBlocks();

  return useMemo(() => {
    const weekly = new Map(weeklyRows.map((r) => [r.weekday, r.templateId]));
    const overrides = new Map(overrideRows.map((r) => [r.date, r.templateId]));
    const infos = new Map<string, TemplateInfo>(
      templates.map((t) => {
        const rows = items.get(t.id) ?? [];
        return [
          t.id,
          {
            id: t.id,
            name: t.name,
            exerciseCount: rows.length,
            minutes: estimateTemplate(blocks.get(t.id) ?? [], rows).minutes,
            muscles: [...new Set(rows.map((r) => fr.exercises.muscles[r.muscle].toLowerCase()))],
            summary: templateSummary(blocks.get(t.id) ?? [], rows),
          },
        ];
      }),
    );
    return { weekly, overrides, templates: infos, templateList: templates };
  }, [blocks, items, overrideRows, templates, weeklyRows]);
}
