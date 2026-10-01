#!/bin/sh
# Publie une mise à jour OTA (JavaScript uniquement) sur le canal production, puis envoie ses
# source maps à Sentry. Usage : npm run update:prod -- "fix(planning): …"
# Seuls les builds de même version (runtimeVersion = version d'app.json) la reçoivent.
set -e

MESSAGE="${1:?Message obligatoire : npm run update:prod -- \"description\"}"

npx eas-cli@latest update --channel production --environment production --message "$MESSAGE"

# Jeton Sentry : même fichier que pour les builds (jamais commité).
set -a
. ./.env.sentry-build-plugin
set +a
SENTRY_URL=https://de.sentry.io/ SENTRY_ORG=johan-ea SENTRY_PROJECT=surcharge \
  npx sentry-expo-upload-sourcemaps dist
