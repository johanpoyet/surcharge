import { useEffect } from 'react';

import { useTemplateDraft } from '@/features/templates/draftStore';
import { TemplateEditor } from '@/features/templates/components/TemplateEditor';

export default function NewTemplateScreen() {
  const load = useTemplateDraft((state) => state.load);
  useEffect(() => load({ name: '', weekdays: [], items: [] }), [load]);
  return <TemplateEditor mode="create" />;
}
