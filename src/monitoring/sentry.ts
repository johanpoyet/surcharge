import * as Sentry from '@sentry/react-native';

import { stripQuery } from './url';

// Rapports de plantage (SPEC Phase 10). Hébergement Sentry UE (Francfort), aucune donnée
// personnelle : pas d'IP ni d'identifiant utilisateur, adresses d'API sans paramètres.
const DSN =
  'https://e1dcee7b00009325eb3ab59594005ab8@o4510425302499328.ingest.de.sentry.io/4512181051654224';

export function initSentry(): void {
  Sentry.init({
    dsn: DSN,
    // Uniquement les builds de production (TestFlight, App Store) : pas de bruit en développement.
    enabled: !__DEV__,
    sendDefaultPii: false,
    beforeBreadcrumb(breadcrumb) {
      const url: unknown = breadcrumb.data?.url;
      if (typeof url === 'string') {
        return { ...breadcrumb, data: { ...breadcrumb.data, url: stripQuery(url) } };
      }
      return breadcrumb;
    },
  });
}

export const wrapRoot = Sentry.wrap;
export const captureException = Sentry.captureException;
