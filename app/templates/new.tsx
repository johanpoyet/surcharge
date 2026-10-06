import { useEffect } from 'react';

import { TemplateEditor } from '@/features/templates/components/TemplateEditor';
import { useTemplateDraft } from '@/features/templates/draftStore';

export default function NewTemplateScreen() {
  const load = useTemplateDraft((state) => state.load);
  // Une séance neuve commence par un bloc Musculation vide (le cas le plus courant, comme en V1).
  useEffect(
    () =>
      load({
        name: '',
        weekdays: [],
        blocks: [{ type: 'strength', name: null, config: {}, items: [] }],
      }),
    [load],
  );
  return <TemplateEditor mode="create" />;
}
