import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  background,
  font,
  foregroundStyle,
  frame,
  labelsHidden,
  monospacedDigit,
  multilineTextAlignment,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

/**
 * Données du chrono de repos affiché hors de l'app (Dynamic Island, écran verrouillé).
 * Couleurs et textes passés en props : le composant tourne dans un runtime isolé (directive
 * 'widget') et ne peut rien importer (ni tokens, ni i18n).
 */
export type RestActivityProps = {
  /** Début et fin du repos, en millisecondes depuis l'epoch. */
  startedAt: number;
  endsAt: number;
  title: string;
  next: string;
  volt: string;
  text: string;
  muted: string;
  /** Fond du bandeau de l'écran verrouillé : sombre comme l'app, quel que soit le mode iOS. */
  bg: string;
};

const RestActivity = (props: RestActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const range = { lower: new Date(props.startedAt), upper: new Date(props.endsAt) };
  // Écran « toujours allumé » : couleurs atténuées par le système, on garde un texte clair.
  const accent = environment.isLuminanceReduced ? props.text : props.volt;
  const timer = (size: number) => (
    <Text
      timerInterval={range}
      countsDown
      modifiers={[
        font({ size, weight: 'heavy', design: 'rounded' }),
        monospacedDigit(),
        foregroundStyle(accent),
        // Le texte d'un chrono prend toute la largeur dispo : on le cale à droite.
        multilineTextAlignment('trailing'),
      ]}
    />
  );
  const icon = <Image systemName="timer" color={props.volt} />;

  return {
    banner: (
      <VStack spacing={8} modifiers={[padding({ all: 16 }), background(props.bg)]}>
        <HStack>
          <VStack alignment="leading" spacing={2}>
            <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(props.text)]}>
              {props.title}
            </Text>
            <Text modifiers={[font({ size: 13 }), foregroundStyle(props.muted)]}>{props.next}</Text>
          </VStack>
          <Spacer />
          {timer(34)}
        </HStack>
        <ProgressView timerInterval={range} countsDown modifiers={[tint(accent), labelsHidden()]} />
      </VStack>
    ),
    compactLeading: icon,
    compactTrailing: (
      <Text
        timerInterval={range}
        countsDown
        modifiers={[
          font({ size: 15, weight: 'semibold' }),
          monospacedDigit(),
          foregroundStyle(props.volt),
          frame({ maxWidth: 52 }),
        ]}
      />
    ),
    minimal: icon,
    expandedLeading: (
      <HStack spacing={6}>
        {icon}
        <Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle(props.text)]}>
          {props.title}
        </Text>
      </HStack>
    ),
    expandedTrailing: timer(28),
    expandedBottom: (
      <VStack alignment="leading" spacing={6}>
        <Text modifiers={[font({ size: 13 }), foregroundStyle(props.muted)]}>{props.next}</Text>
        <ProgressView
          timerInterval={range}
          countsDown
          modifiers={[tint(props.volt), labelsHidden()]}
        />
      </VStack>
    ),
  };
};

export default createLiveActivity('RestActivity', RestActivity);
