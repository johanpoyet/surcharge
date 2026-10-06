import {
  colors,
  fonts,
  fontSizes,
  letterSpacings,
  onVoltAlpha,
  scrim,
  radii,
  spacing,
  voltAlpha,
} from './tokens';

// Preset Tailwind généré depuis les tokens : aucune valeur n'est dupliquée.
const sizeScale = Object.fromEntries(
  [...fontSizes.display, ...fontSizes.body].map((size) => [String(size), `${size}px`]),
);

const px = <T extends Record<string, number>>(values: T) =>
  Object.fromEntries(Object.entries(values).map(([key, value]) => [key, `${value}px`]));

const preset = {
  theme: {
    extend: {
      colors: {
        ...colors,
        'volt-subtle': voltAlpha.subtle,
        'volt-selected': voltAlpha.selected,
        'volt-soft': voltAlpha.soft,
        'volt-border': voltAlpha.border,
        'onVolt-tag': onVoltAlpha.tag,
        scrim,
      },
      fontFamily: {
        display: [fonts.display],
        body: [fonts.body],
        'body-medium': [fonts.bodyMedium],
        'body-semibold': [fonts.bodySemibold],
        'body-bold': [fonts.bodyBold],
      },
      fontSize: sizeScale,
      borderRadius: px(radii),
      spacing: px(spacing),
      letterSpacing: px(letterSpacings),
    },
  },
};

export default preset;
