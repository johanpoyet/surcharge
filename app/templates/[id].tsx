import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { TemplateEditor } from '@/features/templates/components/TemplateEditor';
import { useTemplateDraft } from '@/features/templates/draftStore';
import { draftFromBlocks } from '@/features/templates/draftConvert';
import { getTemplate, listTemplateBlocks, templateWeekdays } from '@/features/templates/repository';

export default function EditTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const load = useTemplateDraft((state) => state.load);
  // Prêt dès que le brouillon chargé est celui de cette séance type.
  const ready = useTemplateDraft((state) => state.templateId === id);

  // Chargement unique à l'ouverture : les retours de « choisir des exercices » gardent le brouillon.
  useEffect(() => {
    const userId = session?.user.id;
    const template = getTemplate(db, id);
    if (!userId || !template) return;
    load({
      templateId: id,
      name: template.name,
      weekdays: templateWeekdays(db, userId, id),
      blocks: draftFromBlocks(listTemplateBlocks(db, id)),
    });
  }, [id, load, session?.user.id]);

  return ready ? <TemplateEditor mode="edit" /> : null;
}
