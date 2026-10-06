import { and, asc, eq, isNull, max } from 'drizzle-orm';

import { templateBlocks, templateExercises, workoutTemplates } from '@/db/schema';
import { nowIso } from '@/db/time';
import { enqueue, type Tx } from '@/sync/outbox';

/**
 * Bloc Musculation d'une séance type, créé si besoin. On prend le premier bloc Musculation actif ;
 * sinon le bloc d'id = id de la séance type (celui de la reprise V1, côté Supabase comme en local),
 * restauré s'il avait été supprimé, ou créé à la fin de la séance.
 */
export function strengthBlockFor(tx: Tx, userId: string, templateId: string): string {
  const active = tx
    .select({ id: templateBlocks.id })
    .from(templateBlocks)
    .where(
      and(
        eq(templateBlocks.templateId, templateId),
        eq(templateBlocks.type, 'strength'),
        isNull(templateBlocks.deletedAt),
      ),
    )
    .orderBy(asc(templateBlocks.position))
    .get();
  if (active) return active.id;

  const now = nowIso();
  const existing = tx
    .select({ id: templateBlocks.id })
    .from(templateBlocks)
    .where(eq(templateBlocks.id, templateId))
    .get();
  if (existing) {
    tx.update(templateBlocks)
      .set({ type: 'strength', deletedAt: null, updatedAt: now, dirty: true })
      .where(eq(templateBlocks.id, templateId))
      .run();
  } else {
    const last = tx
      .select({ position: max(templateBlocks.position) })
      .from(templateBlocks)
      .where(and(eq(templateBlocks.templateId, templateId), isNull(templateBlocks.deletedAt)))
      .get();
    tx.insert(templateBlocks)
      .values({
        id: templateId,
        userId,
        templateId,
        position: last?.position == null ? 0 : last.position + 1,
        type: 'strength',
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .run();
  }
  enqueue(tx, 'template_blocks', templateId, 'upsert');
  return templateId;
}

/**
 * Reprise locale des séances types V1 (SPEC_V2 §3), idempotente : un bloc Musculation pour chaque
 * séance type qui n'a encore aucun bloc (y compris celles créées par une ancienne version sur un
 * autre appareil), et rattachement des exercices sans bloc. Retourne le nombre de lignes modifiées.
 */
export function ensureStrengthBlocks(tx: Tx, userId: string): number {
  let changed = 0;
  const now = nowIso();

  const templates = tx
    .select({ id: workoutTemplates.id, deletedAt: workoutTemplates.deletedAt })
    .from(workoutTemplates)
    .where(eq(workoutTemplates.userId, userId))
    .all();
  const withBlocks = new Set(
    tx
      .select({ templateId: templateBlocks.templateId })
      .from(templateBlocks)
      .where(eq(templateBlocks.userId, userId))
      .all()
      .map((b) => b.templateId),
  );
  for (const template of templates) {
    if (withBlocks.has(template.id)) continue;
    // Même ligne que la reprise côté Supabase (id = id de la séance type).
    tx.insert(templateBlocks)
      .values({
        id: template.id,
        userId,
        templateId: template.id,
        position: 0,
        type: 'strength',
        deletedAt: template.deletedAt,
        createdAt: now,
        updatedAt: now,
        dirty: true,
      })
      .onConflictDoNothing({ target: templateBlocks.id })
      .run();
    enqueue(tx, 'template_blocks', template.id, 'upsert');
    changed++;
  }

  const deletedTemplates = new Set(templates.filter((t) => t.deletedAt).map((t) => t.id));
  const orphans = tx
    .select({ id: templateExercises.id, templateId: templateExercises.templateId })
    .from(templateExercises)
    .where(
      and(
        eq(templateExercises.userId, userId),
        isNull(templateExercises.blockId),
        isNull(templateExercises.deletedAt),
      ),
    )
    .all();
  for (const orphan of orphans) {
    if (deletedTemplates.has(orphan.templateId)) continue;
    const blockId = strengthBlockFor(tx, userId, orphan.templateId);
    tx.update(templateExercises)
      .set({ blockId, updatedAt: nowIso(), dirty: true })
      .where(eq(templateExercises.id, orphan.id))
      .run();
    enqueue(tx, 'template_exercises', orphan.id, 'upsert');
    changed++;
  }
  return changed;
}
