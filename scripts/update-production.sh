#!/bin/sh
# Publie une mise à jour OTA (JavaScript uniquement) sur le canal production, puis envoie ses
# source maps à Sentry. Usage : npm run update:prod -- "fix(planning): …"
# Seuls les builds de même version (runtimeVersion = version d'app.json) la reçoivent.
set -e

MESSAGE="${1:?Message obligatoire : npm run update:prod -- \"description\"}"

# Jeton Sentry : même fichier que pour les builds (jamais commité).
set -a
. ./.env.sentry-build-plugin
set +a

# Une plateforme à la fois (« all » inclurait le web, que l'app n'a pas) ; `dist` est réécrit à
# chaque export, d'où l'envoi des source maps juste après.
for PLATFORM in ios android; do
  npx eas-cli@latest update --channel production --environment production \
    --platform "$PLATFORM" --message "$MESSAGE"
  SENTRY_URL=https://de.sentry.io/ SENTRY_ORG=johan-ea SENTRY_PROJECT=surcharge \
    npx sentry-expo-upload-sourcemaps dist
done
