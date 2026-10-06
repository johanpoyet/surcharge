import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { liveDb } from '@/db/client';
import type { WorkoutTemplate } from '@/db/schema';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  activeTemplatesQuery,
  templateBlocksQuery,
  templateItemsQuery,
  weeklyScheduleQuery,
  type TemplateBlockRow,
  type TemplateItemRow,
} from './repository';

const useUserId = () => useAuth().session?.user.id ?? '';

export function useTemplates(): WorkoutTemplate[] {
  const userId = useUserId();
  const { data } = useLiveQuery(activeTemplatesQuery(liveDb, userId), [userId]);
  return data;
}

/** Lignes des séances types, regroupées par séance type (dans l'ordre). */
export function useTemplateItems(): Map<string, TemplateItemRow[]> {
  const userId = useUserId();
  const { data } = useLiveQuery(templateItemsQuery(liveDb, userId), [userId]);
  return useMemo(() => {
    const map = new Map<string, TemplateItemRow[]>();
    for (const row of data) {
      const list = map.get(row.templateId) ?? [];
      list.push(row);
      map.set(row.templateId, list);
    }
    return map;
  }, [data]);
}

/** Jours au modèle de semaine par séance type (1 = lundi … 7). */
export function useTemplateWeekdays(): Map<string, number[]> {
  const userId = useUserId();
  const { data } = useLiveQuery(weeklyScheduleQuery(liveDb, userId), [userId]);
  return useMemo(() => {
    const map = new Map<string, number[]>();
    for (const row of data) {
      map.set(row.templateId, [...(map.get(row.templateId) ?? []), row.weekday].sort());
    }
    return map;
  }, [data]);
}

/** Blocs des séances types, regroupés par séance type (dans l'ordre). */
export function useTemplateBlocks(): Map<string, TemplateBlockRow[]> {
  const userId = useUserId();
  const { data } = useLiveQuery(templateBlocksQuery(liveDb, userId), [userId]);
  return useMemo(() => {
    const map = new Map<string, TemplateBlockRow[]>();
    for (const row of data) map.set(row.templateId, [...(map.get(row.templateId) ?? []), row]);
    return map;
  }, [data]);
}
