import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

import { useToast } from '@/components/ui';
import { db } from '@/db/client';
import { ExerciseForm } from '@/features/exercises/components/ExerciseForm';
import { useExercise } from '@/features/exercises/hooks';
import { deleteExercise, updateExercise } from '@/features/exercises/repository';
import { useProfile } from '@/features/profile/hooks';
import { fr } from '@/i18n/fr';

const t = fr.exercises.form;

export default function EditExerciseScreen() {
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = useExercise(id);
  const unit = useProfile().profile?.weightUnit ?? 'kg';

  // Le formulaire s'initialise une fois l'exercice lu en base.
  if (!exercise) return null;

  const confirmDelete = () =>
    Alert.alert(t.deleteTitle, t.deleteMessage, [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteExercise(db, exercise.id);
          toast.show(t.deleted);
          router.dismissTo('/exercises');
        },
      },
    ]);

  return (
    <ExerciseForm
      mode="edit"
      initial={exercise}
      unit={unit}
      onCancel={() => router.back()}
      onDelete={confirmDelete}
      onSubmit={(values) => {
        updateExercise(db, exercise.id, {
          name: values.name,
          muscle: values.muscle,
          equipment: values.equipment,
          weightStep: values.weightStepKg,
          note: values.note,
          photoLocalUri: values.photoLocalUri,
        });
        toast.show(t.saved);
        router.back();
      }}
    />
  );
}
