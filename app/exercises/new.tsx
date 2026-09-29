import { router } from 'expo-router';

import { useToast } from '@/components/ui';
import { db } from '@/db/client';
import { useAuth } from '@/features/auth/AuthProvider';
import { ExerciseForm } from '@/features/exercises/components/ExerciseForm';
import { createExercise } from '@/features/exercises/repository';
import { useProfile } from '@/features/profile/hooks';
import { fr } from '@/i18n/fr';

export default function NewExerciseScreen() {
  const toast = useToast();
  const { session } = useAuth();
  const unit = useProfile().profile?.weightUnit ?? 'kg';

  return (
    <ExerciseForm
      mode="create"
      unit={unit}
      onCancel={() => router.back()}
      onSubmit={(values) => {
        if (!session) return;
        createExercise(db, session.user.id, {
          name: values.name,
          muscle: values.muscle,
          equipment: values.equipment,
          weightStep: values.weightStepKg,
          note: values.note,
          photoLocalUri: values.photoLocalUri,
        });
        toast.show(fr.exercises.form.created);
        router.back();
      }}
    />
  );
}
