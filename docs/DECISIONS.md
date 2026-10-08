# Décisions

Choix faits quand le SPEC ne tranchait pas (règle 7), du plus ancien au plus récent.

## Phase 0

- **Expo SDK 57** (dernier stable au 28/09/2026), React Native 0.86, React 19.2.
- **NativeWind 4.2.7 + Tailwind 3.4** : la v4 est la version stable ; la v5 est encore en
  release candidate.
- **`react-dom` ajouté** (hors liste section 2) : dépendance paire d'`expo-router`, sans elle
  npm tire React DOM 19.3 qui entre en conflit avec React 19.2.3. Aucun usage direct.
- **`react-native-worklets`** : requis par Reanimated 4 (qui est dans la liste section 2).
- **`babel-preset-expo` en devDependency explicite** : nécessaire pour la config Babel de
  NativeWind.
- **`inlineRem: 16`** dans Metro (NativeWind utilise 14 par défaut) pour que les classes
  Tailwind standard tombent sur les pixels des maquettes.
- **Tokens → Tailwind** : `src/theme/tokens.ts` est la source unique ; `tailwind-preset.ts` en
  dérive les classes. Tailles de police nommées par leur valeur (`text-60`, `text-13`), rayons
  par usage (`rounded-tag`, `rounded-input`, `rounded-cta`, `rounded-card`, `rounded-hero`).
- **Routes dans `app/` à la racine** (et non `src/app/`) comme l'arborescence section 3.
- **Écran de test `app/index.tsx`** : temporaire, remplacé par la garde d'auth en Phase 2.
- **Icône et splash** : ceux du gabarit Expo en attendant la Phase 10 ; fond du splash déjà
  en `#0A0A0A`.
- **Prettier sans `eslint-config-prettier`** : ESLint et Prettier tournent séparément
  (`npm run lint`, `npm run format`) pour ne pas ajouter de dépendance.
- **`expo-build-properties` + `ios.enableSceneSupport: true`** : Xcode 27 (SDK iOS 27) refuse de
  lancer une app sans cycle de vie UIScene. Sur le SDK 57, Expo (≥ 57.0.23) le rend activable
  par cette propriété ; il devient le comportement par défaut en SDK 58 (retirer alors
  l'option). Après changement : `npx expo prebuild --clean`.
- **Interligne des gros titres** : sur iOS, un `lineHeight` inférieur à la taille de police
  (ex. 55 px pour 60 px, comme la maquette de connexion) rogne les accents des majuscules
  (« SOULÈVE »). À traiter dans le composant de titre en Phase 1 (une ligne par `Text`).

## Phase 1

- **`react-native-svg`** (hors liste section 2) : dépendance obligatoire de `lucide-react-native`
  (seule lib d'icônes autorisée) ; sert aussi au logo et au filigrane.
- **`expo-image` et `expo-haptics` installés dès la Phase 1** (prévus section 2) : utilisés par
  PhotoSlot et par le Stepper / DifficultyPicker.
- **Tokens ajoutés depuis les maquettes** : `lineStrong` `#3A3A3A` (bordures pointillées),
  opacités du volt (`volt-subtle` / `volt-soft` / `volt-border`) et du noir sur volt,
  tailles 56 / 40 / 32 / 24 / 18 / 10, rayons 7 (badge) et 16, espacements de lettres en px
  (React Native n'a pas d'unité em).
- **Button `secondary`** : fond transparent + bordure `line` comme les maquettes (Apple / Google,
  « Modifier ») plutôt que fond `surface` du SPEC. Variantes `dark` / `darkOutline` ajoutées pour
  la carte volt « Séance du jour ».
- **Switch 48×28** (SPEC) ; les maquettes montrent 46×28. État désactivé : piste `line`,
  pastille `muted` (absent des maquettes).
- **TabBar présentationnelle** : elle reçoit onglets, onglet actif et callbacks ; le branchement
  sur la navigation Expo Router se fera avec le layout `(tabs)` en Phase 2.
- **Composants en plus de la section 5** : `Heading`, `StackedTitle` (titre multi-lignes serré
  sans rogner les accents), `Overline`, `Logo`, `BrandWatermark`, `Checkbox` (CGU) et
  `ProgressSegments` (séance, inscription).
- **Écran `/_dev/components`** : redirige vers `/` hors mode développement.
- **Tests** : Lucide est résolu vers son build CommonJS dans Jest (le build React Native est en
  `.mjs`) ; safe area et haptique sont simulés dans `jest.setup.ts`.

## Phase 2

- **Création du profil par trigger** (`0002_profil_auto.sql`) : `on_auth_user_created` insère la
  ligne `profiles` avec le prénom des métadonnées d'inscription (ou `given_name` pour
  Apple / Google, sinon le début de l'e-mail). Fonctionne pour tous les modes de connexion.
- **Migrations testées sur PGlite** avec une simulation minimale des schémas Supabase (`auth`,
  `storage`, `moddatetime`) : trigger profil, RLS lecture / écriture, `updated_at`, contraintes.
- **CLI Supabase via `npx supabase`** (non ajoutée au `package.json`) : l'installation Homebrew
  exige des Command Line Tools à jour.
- **« Confirm email » désactivé** dans Supabase : l'inscription enchaîne directement sur
  l'onboarding. Si le réglage est réactivé, l'app affiche un message au lieu de planter.
- **Onboarding enregistré directement dans Supabase** (profil + première pesée) : il suit
  l'inscription, donc en ligne. Passage par SQLite + outbox en Phase 3, avec le seed.
- **Onboarding en cours = état en mémoire** (`onboardingPending`) : si l'app est tuée pendant
  l'étape 2, on arrive sur l'accueil (comme « Passer cette étape »). Retour depuis l'étape 2 =
  déconnexion (le compte est déjà créé).
- **Mot de passe oublié** : le lien est demandé depuis l'écran de connexion avec l'e-mail saisi
  (pas d'écran dédié) ; flux PKCE, le lien rouvre `surcharge://reset-password?code=…`.
- **Apple et Google** : boutons présents mais inactifs (toast « bientôt disponible »). Il faut le
  compte Apple Developer payant (la capacité Sign in with Apple empêche de signer avec une
  Personal Team gratuite) et des identifiants OAuth Google.
- **`zodResolver` maison** (`src/lib/zodResolver.ts`) plutôt que `@hookform/resolvers`, pour ne
  pas ajouter de dépendance.
- **Types Supabase écrits à la main** (`database.types.ts`, tables utilisées seulement) ; à
  régénérer avec `npx supabase gen types` une fois le projet lié.
- **Onglets et accueil provisoires** : TabBar branchée sur Expo Router, écrans vides sauf
  l'en-tête d'accueil et la déconnexion dans le Profil.

## Phase 3

- **Drizzle stable** (`drizzle-orm` 0.45, `drizzle-kit` 0.31) plutôt que les versions candidates 1.0
  de la doc.
- **Dépendances de développement hors liste** : `babel-plugin-inline-import` (exigé par
  drizzle-kit pour embarquer les migrations `.sql`), `sql.js` (SQLite en JavaScript pour tester
  les repositories dans Jest, sans module natif) et `@types/node` (types des tests).
- **Migrations locales dans `src/db/migrations`**, générées par `npm run db:generate` et appliquées
  au démarrage (`useMigrations`) ; les tests des repositories rejouent ces mêmes fichiers.
- **Pas de clés étrangères en local** : la synchro peut recevoir un enfant avant son parent et les
  suppressions sont douces ; l'intégrité reste garantie par Supabase.
- **Outbox : une entrée par ligne** (index unique `table_name` + `row_id`) ; le push enverra l'état
  le plus récent de la ligne. Suppression douce = entrée `delete` (la ligne porte `deleted_at`).
- **Repositories synchrones** prenant la base en paramètre (`AppDatabase`), pour être testés sur
  sql.js ; les écrans lisent via `useLiveQuery` sur la base expo-sqlite.
- **Onboarding** : écrit d'abord dans Supabase (en ligne juste après l'inscription), puis recopie
  profil et pesée en local comme déjà synchronisés (ni `dirty`, ni outbox). La bibliothèque par
  défaut (34 exercices) est ajoutée en local + outbox, y compris si l'étape est passée.
- **Bibliothèque par défaut seulement à l'onboarding** (SPEC) : un compte créé avant la Phase 3
  n'en a pas. Elle n'est ajoutée que si le compte n'a aucun exercice, même supprimé.
- **Profil lu dans SQLite** ; s'il n'y est pas (compte existant, nouvel appareil), il est
  récupéré une fois dans Supabase en attendant le pull complet de la Phase 9.
- **Données locales conservées à la déconnexion** (filtrées par `user_id`) : une déconnexion ne
  doit pas perdre des séances pas encore synchronisées.

## Phase 4

- **Photos** : `expo-image-picker` (recadrage 4:3), compression `expo-image-manipulator` (1080 px max,
  JPEG 0,7), fichier déplacé dans `Documents/exercise-photos/{uuid}.jpg` (`expo-file-system`, nouvelle
  API `File` / `Directory`). Nom par UUID et non par exercice : l'exercice n'existe pas encore à la
  prise de vue. Les photos abandonnées (annulation, remplacement, retrait) sont supprimées.
  Envoi vers Supabase Storage en Phase 9.
- **Accès refusé** à l'appareil photo ou aux photos : message + bouton « Réglages ».
- **Muscle et équipement « Autre »** ajoutés aux chips (valeurs de l'enum, absentes des maquettes).
- **Muscle et équipement obligatoires** à la création (aucun choix par défaut).
- **Pas des boutons en lb** : affiché et saisi dans l'unité du profil (au demi près), enregistré
  en kg. Pour un compte en kg, le pas suit l'équipement (5 kg machine, 2,5 kg sinon) tant qu'il n'a
  pas été modifié à la main.
- **Liste** : charge affichée = charge max réussie de la dernière séance (cohérente avec la
  tendance) ; tendance seulement à partir de 2 séances ; au poids du corps, la charge est le lest
  (« +10 kg », rien à 0). Recherche insensible aux accents et à la casse.
- **Calculs SPEC 9.2 déjà écrits et testés** (`features/stats/calc.ts`) : record, 1RM Epley, charge
  max par séance, volume, tendance. Utilisés par la liste et le détail.
- **Détail** : pas encore de graphique ni de bloc « Ressenti à X kg » / conseil (Phases 6 et 8).
  Historique : 3 dernières séances, « Voir tout l'historique » déplie la liste sur place.
- **Suppression** depuis l'écran de modification (confirmation), retour à la liste.
- **Délai des tests Jest porté à 15 s** : le premier lancement sans cache (sql.js) peut dépasser 5 s.

## Phase 5

- **Glisser-déposer maison** (`ReorderableList`) avec `react-native-gesture-handler` et Reanimated,
  déjà dans la liste section 2 : appui de 120 ms sur la poignée, les autres cartes se décalent en
  direct, défilement bloqué pendant le glisser. Actions VoiceOver « Monter » / « Descendre » sur la
  poignée. Pas de bibliothèque de liste réordonnable en plus.
- **`react-native-gesture-handler` 2.32** (version du SDK 57) déclarée explicitement ; elle remplace
  la 3.3 tirée par Expo Router. `GestureHandlerRootView` à la racine.
- **Zustand** (liste section 2) pour le brouillon de séance type, partagé entre l'éditeur et l'écran
  « Ajouter des exercices ».
- **Enregistrement en une transaction** : nom, exercices dans l'ordre et jours au modèle de semaine.
  Choisir un jour déjà pris par une autre séance type le lui retire (sans avertissement en V1).
  Supprimer une séance type libère ses jours.
- **Saisie des cibles** : reps « 8–10 », « 8-10 », « 8 à 10 » ou « 12 » (vide = pas de cible) ;
  repos « 2:00 », « 90 », « 90s » ou « 2 min » (15 min max.). Remise en forme à la sortie du champ,
  bordure rouge si invalide. Nouvel exercice : 3 séries, 8–12 reps, repos par défaut du profil.
- **Durée estimée** (SPEC 9.4) : Σ séries × (45 s + repos), arrondie à 5 min.
- **Onglet Séances** : « Mes séances » affiché par défaut tant que le Planning (Phase 7) n'existe pas.
  Actions d'une séance type (bouton « … ») : Modifier, Dupliquer (sans les jours), Démarrer
  (Phase 6), Supprimer (confirmation).
- **Nom de séance** saisi tel quel (affiché en majuscules dans les listes par la police de titre).
- **Choix des exercices** : ceux déjà dans la séance sont cochés et grisés (pas de doublon).

## Phase 6

- **État de l'écran persisté dans SQLite** (table locale `workout_state`, JSON, non synchronisée) :
  plan figé au démarrage, exercice affiché, séries ajoutées, valeurs saisies, chrono de repos. Les
  séries validées sont dans `session_sets`. À la réouverture de l'app, une séance non terminée est
  rouverte automatiquement (une fois par lancement).
- **Plan figé** : modifier la séance type pendant une séance ne change pas la séance en cours.
- **Pré-remplissage** : même série à la dernière séance, sinon sa dernière série, sinon la cible
  (reps max, sinon min, sinon 10) avec 20 kg pour une barre et 0 sinon. Complété en 1.1.0 (voir « Correctifs 1.0.x → 1.1.0 »).
- **Conseil de charge** (SPEC 9.3) : sur les séries de la dernière séance ; la charge de référence
  est la charge max de cette séance. Bandeau seulement pour « augmenter » / « baisser ».
- **Après la dernière série d'un exercice**, on passe au prochain exercice non terminé ; le repos
  est celui de l'exercice qui vient d'être fait. Plus aucune série : le bouton devient « Terminer
  la séance ».
- **Modifier une série validée** : la toucher charge ses valeurs dans la carte active (« Modifier la
  série N ») ; glisser vers la gauche pour la supprimer (les suivantes sont renumérotées).
- **Terminer** : confirmation s'il reste des séries prévues ; une séance sans aucune série est
  supprimée au lieu d'être enregistrée.
- **Records battus (récap)** : meilleure série de chaque exercice qui bat le record d'avant la
  séance ; un exercice fait pour la première fois ne compte pas.
- **Notifications locales uniquement** : `expo-notifications` ajoute d'office l'autorisation push
  (`aps-environment`), impossible à signer avec une Personal Team gratuite. Un plugin local
  (`plugins/withoutPushEntitlement.js`) la retire. Au premier plan, pas de bannière (le chrono est
  affiché) : vibration + message dans l'app.
- **Chrono de repos** : −15 s / +15 s et « Passer » en plus de la maquette ; la notification est
  reprogrammée à chaque ajustement et annulée si la série suivante est validée avant la fin.
- **Bouton + central** : reprend la séance en cours, sinon propose la liste des séances types
  (la carte « Séance du jour » de l'accueil arrive en Phase 7).

## Phase 7

- **« Répéter chaque semaine »** activé par défaut (maquette) et mémorisé sur l'appareil
  (AsyncStorage, confort local). Activé : le choix d'un jour modifie le modèle de semaine et retire
  l'exception éventuelle de cette date ; désactivé : seule la date change (exception).
- **Menu d'un jour** (toucher ou appui long) : séances types, Repos, « Déplacer vers… » (jours de la
  semaine affichée, toujours en exceptions) et « Revenir au modèle de semaine » si la date a une
  exception. Mention « Juste ce jour » sur les jours modifiés.
- **Vue mois** : jours hors mois atténués (opacité) plutôt que deux nouvelles couleurs ; étiquette
  pleine volt pour aujourd'hui et les jours faits, contour volt pour les jours prévus.
- **Accueil – carte du jour** : séance en cours (Reprendre) > séance faite aujourd'hui (Séance faite
  ✓ + récap) > aucune séance type (Créer) > séance prévue (Démarrer / Changer) > repos (Faire une
  séance quand même). « Changer » démarre une autre séance type, sans modifier le planning.
- **Records du mois** : séries qui battaient le record de leur exercice au moment où elles ont été
  faites (la première série d'un exercice ne compte pas). Point « record » sur le calendrier.
- **Progression** : exercice fait dans le plus de séances ; 8 dernières charges max ; badge
  « +X en N sem. » seulement en cas de gain.
- **Poids corporel** : variation sur les 30 derniers jours ; carte masquée sans pesée.
- **Pas de cloche** dans l'en-tête de l'accueil (pas de centre de notifications en V1) ; l'avatar
  ouvre le Profil.
- **Rappels** : reprogrammés sur 14 jours à chaque changement du planning ou du réglage, à 9 h 00,
  seulement si l'autorisation des notifications a déjà été donnée (demandée au premier repos).
  Le réglage « Rappels » du Profil arrive en Phase 8 (activé par défaut).
- **Graphiques simples** (barres en vues, courbe en SVG) en attendant victory-native (Phase 8).

## Phase 8

- **victory-native 42 + Skia 2.6** (liste section 2) ; **expo-sharing** ajouté avec l'accord de Johan
  pour l'export CSV.
- **Composant `LineChart`** (victory-native) : courbe volt, points pleins, records en cercle vide,
  graduations en Barlow 500 (police passée à Skia). Libellés de mois sous la courbe en texte.
- **Accueil** : les barres « Progression » et la courbe du poids gardent leurs dessins simples (vues
  et SVG), plus fidèles aux maquettes qu'un graphique complet ; victory-native sert au détail
  exercice et au profil.
- **Détail exercice** : Charge = charge max réussie par séance, Volume = Σ charge × reps,
  Reps = total des reps de la séance. Record (cercle vide) = séance contenant une série qui a
  battu le record à ce moment-là. « Ressenti à X kg » : X = charge max de la dernière séance,
  répartition sur toutes les séries à cette charge ; conseil SPEC 9.3 sur la dernière séance
  (sans cible de reps depuis ce détail).
- **Profil** : heures = somme des durées des séances terminées ; tonnes = volume total / 1000,
  toujours en tonnes métriques ; records = meilleur set de chaque exercice, le plus récent d'abord
  (3 affichés, « Tout voir »). Prénom modifiable (invite iOS). Réglages : unité, repos par défaut
  (1:00 à 3:00), rappels, export CSV. Pas d'icône Réglages dans l'en-tête : tout est sur l'écran.
- **Pesée** : écran modal, pesée du jour (remplace celle du jour si elle existe).
- **CSV** : séparateur « ; », virgule décimale, BOM UTF-8 (ouverture directe dans Excel / Numbers
  en français) ; une ligne par série des séances terminées.
- **Modifications du profil** enregistrées en local + outbox : elles atteindront Supabase avec la
  synchronisation (Phase 9).

## Phase 9

- **`updated_at` fixé par le serveur à l'insertion** (migration `0003`, appliquée le 30/09/2026) :
  le pull incrémental ne dépend que de l'horloge de Supabase. Pull avec 60 s de recouvrement
  (`updated_at >= dernier pull − 60 s`) ; les lignes reçues deux fois sont sans effet.
- **Dernier pull par utilisateur** (`sync_state.table_name` = `{user_id}/{table}`) : plusieurs comptes
  sur le même téléphone ne se gênent pas. Le push n'envoie que les lignes du compte connecté ;
  celles d'un autre compte restent dans l'outbox jusqu'à sa prochaine connexion.
- **Push** : par table dans l'ordre des dépendances, par lots de 100 (`upsert` sur `id`), outbox
  dans l'ordre chronologique (une ligne supprimée part avant celle qui la remplace, à cause des
  index uniques partiels). Une ligne modifiée pendant l'envoi reste `dirty` et repart ensuite.
  Échec : `attempts` + 1, nouvelle tentative espacée (60 s × 2^échecs, 15 min max.).
- **Horodatages strictement croissants** (`nowIso`) : deux écritures n'ont jamais le même
  `updated_at`, ce qui fiabilise la détection « modifié pendant l'envoi ».
- **Conflits** : une ligne locale pas encore envoyée n'est pas écrasée par le pull ; ensuite, la
  dernière écriture envoyée gagne.
- **Photos** : chemin `{user_id}/{exercise_id}-{horodatage}.jpg` plutôt que `{exercise_id}.jpg`, pour
  qu'une photo remplacée soit retéléchargée par les autres appareils. Changer ou retirer la photo
  remet `photo_path` à vide (nouvel envoi). Les photos manquantes sont téléchargées juste après le
  pull (URL signée), pas à l'affichage. Les anciennes photos ne sont pas supprimées du bucket (V1).
- **Déclencheurs** : ouverture des onglets (démarrage, connexion), retour du réseau (NetInfo), retour
  de l'app au premier plan, fin de séance, et toutes les 60 s s'il reste des modifications.
- **Séance commencée sur un autre appareil** : pas d'état d'écran local (`workout_state`) ;
  levé en 1.1.0, voir « Séance démarrée sur un autre appareil ».

## Phase 10 (partie sans comptes Apple / Sentry)

- **Suppression de compte** : Edge Function `delete-account` (déployée le 30/09/2026) : l'utilisateur
  est identifié par son propre jeton, ses photos (`exercise-photos/{user_id}/`) sont effacées, puis
  `auth.admin.deleteUser` (cascade sur toutes ses lignes). Double confirmation dans le Profil ;
  ensuite la base locale et les photos du téléphone sont vidées et la session locale fermée.
  Appel refusé sans jeton valide (vérifié : 401).
- **Code Deno exclu** du typecheck, du lint et de Jest de l'app (`supabase/functions`).
- **Icône** : logo du SPEC (carré volt, barres noires) à 62 % sur fond `#0A0A0A`, sans canal alpha
  (exigence App Store). Écran de démarrage : logo seul sur `#0A0A0A`. Icônes Android adaptatives
  (premier plan dans la zone sûre, fond noir, monochrome). Générées depuis le SVG avec resvg
  (outil hors projet).
- **`eas.json`** : `development`, `development-simulator`, `preview` (distribution store →
  TestFlight / test interne Play), `production` (numéro de build incrémenté par EAS).
  Variables `EXPO_PUBLIC_SUPABASE_*` à créer dans les environnements EAS (le `.env` n'est pas envoyé).
- **Export** : `ITSAppUsesNonExemptEncryption = false` (HTTPS uniquement), `buildNumber` 1.
- **Liens CGU et confidentialité** dans le Profil (`src/config.ts`, pages à héberger).
- **En attente** : Sentry (compte + DSN), EAS (compte Expo, `eas init`), build TestFlight (compte
  Apple Developer), connexion Apple et Google, EAS Update (`expo-updates`).

## Connexion Apple (branche `auth/apple-google`)

- **Bouton officiel d'Apple** (`AppleAuthenticationButton`, style blanc, rayon 12, hauteur 50) au lieu
  du bouton « Apple » des maquettes : les règles de validation d'Apple l'imposent.
- **Nonce** : envoyé haché (SHA-256) à Apple, en clair à Supabase (`signInWithIdToken`).
- **Prénom** : Apple ne le donne qu'à la première autorisation ; il est alors écrit dans les
  métadonnées et dans `profiles` (le trigger a mis le début de l'e-mail).
- **Nouveau compte** (création et première connexion à moins d'une minute d'écart) : onboarding ;
  sinon, accueil.
- **Branche fusionnée seulement avec le compte Apple Developer payant** : la capacité Sign in with
  Apple ne peut pas être signée par une Personal Team gratuite. Compte payant actif le 30/09/2026
  (même Team ID `R7GAYTSBWH`) ; l'interrupteur temporaire `SANS_APPLE_SIGNIN` a été retiré.
- **Connexion Google** : `@react-native-google-signin/google-signin` (liste section 2), jeton
  d'identité vérifié par Supabase (`signInWithIdToken`, « Skip nonce checks » activé côté Supabase :
  le SDK iOS ne fournit pas de nonce). Identifiants OAuth iOS et Web (publics) dans
  `src/config.ts` ; le secret du client Web n'est que dans Supabase. Le prénom vient de
  `given_name`, repris par le trigger de création du profil. Bouton aux couleurs de l'app avec le
  « G » de Google. Testable dès maintenant sur le simulateur (pas besoin du compte Apple payant).

## Retours TestFlight (build 1)

- **Onboarding après Apple / Google** : un nouveau compte social est maintenant redirigé vers
  l'onboarding (la redirection manquait : l'app restait sur la connexion, puis sautait l'onboarding
  et donc la bibliothèque d'exercices).
- **Bibliothèque vide** : bouton « Ajouter les exercices de base » (onglet Exercices et choix des
  exercices) ; n'ajoute que les exercices par défaut absents parmi les exercices actifs.
- **Numéro de build incrémenté aussi pour `preview`** (TestFlight refuse deux builds identiques).

## Sentry (branche `monitoring/sentry`)

- **Région UE** (Francfort), organisation `johan-ea`, projet `surcharge`. DSN dans
  `src/monitoring/sentry.ts` (public par nature).
- **Actif seulement hors `__DEV__`** (TestFlight, App Store) : pas de bruit pendant le développement.
- **Aucune donnée personnelle** : `sendDefaultPii: false` (pas d'IP), pas de `setUser`, adresses
  des requêtes sans paramètres (les filtres Supabase contiennent l'identifiant du compte). Rapports
  « non liés » à l'identité dans le questionnaire App Store.
- **Pas de suivi de performance ni de replay** : uniquement les plantages et erreurs (offre gratuite).
- Erreur de migration SQLite envoyée à Sentry (écran d'erreur base de données).
- Source maps via `getSentryExpoConfig` (Metro) et la phase Xcode du plugin ; jeton dans
  `.env.sentry-build-plugin` (ignoré par Git).

## E-mails via Resend (branche `auth/emails-resend`)

- **SMTP personnalisé Supabase → Resend** (domaine `send.johanpoyet.fr` déjà vérifié, région
  Irlande), expéditeur `Surcharge <noreply@send.johanpoyet.fr>`. Le service de test de Supabase est
  limité à quelques e-mails par heure.
- **Seul e-mail envoyé** : mot de passe oublié (confirmation d'inscription désactivée). Modèle
  français aux couleurs de l'app dans `supabase/templates/recovery.html`, recopié à la main dans le
  tableau de bord (le `config.toml` ne sert qu'au Supabase local).
- **Suivi des ouvertures et des clics désactivé** dans Resend.
- Clé d'API Resend (accès envoi, limitée au domaine) saisie uniquement dans Supabase.

## EAS Update (branche `deploiement/eas-update`)

- **`expo-updates`** (SPEC section 2), à partir de la **1.0.1** : le build 4 (1.0.0) en vérification
  ne l'a pas.
- **`runtimeVersion` = version de l'app** (`appVersion`) : une mise à jour ne vise que les builds
  de la même version ; changement natif = nouvelle version.
- **Un seul canal, `production`**, fixé dans `app.json` (`requestHeaders`) car les builds sont faits
  en local avec Xcode (pas EAS Build) ; aussi déclaré dans `eas.json` pour EAS Build. TestFlight et
  l'App Store partagent le même binaire, donc le même canal : tester une mise à jour en Release sur
  le simulateur avant de la publier.
- **Vérification au lancement, sans attente** (`ON_LOAD`, `fallbackToCacheTimeout: 0`) : l'app
  démarre toujours avec la version en cache ; la mise à jour s'applique au lancement suivant.
- `npm run update:prod -- "message"` publie et envoie les source maps à Sentry.
- Politique de confidentialité : Expo ajouté (données techniques de la vérification).


## Chrono de repos en Live Activity (branche `seance/live-activity`)

- **`expo-widgets` + `@expo/ui`** (accord de Johan, hors SPEC section 2) : solution officielle
  Expo ; `expo-live-activity` (Software Mansion) est archivé depuis juin 2026.
- **Extension `ExpoWidgetsTarget`** (`fr.johanpoyet.surcharge.widgets`), groupe d'apps
  `group.fr.johanpoyet.surcharge`. Pas de push : la Live Activity est démarrée et arrêtée par l'app.
- **Contenu** : Dynamic Island (icône chrono + compte à rebours volt ; dépliée : « Repos »,
  compte à rebours, série suivante, barre) et bandeau de l'écran verrouillé sur fond `bg`, quel
  que soit le mode iOS (texte foncé illisible sinon). Compte à rebours natif (`timerInterval`) :
  aucune mise à jour à envoyer pendant le repos. Appui = ouverture de la séance
  (`surcharge://workout/<id>`).
- **Fin** : repos passé (au retour dans l'app), série validée, repos passé ou séance terminée ;
  au montage de la séance sans repos en cours, un chrono resté affiché est retiré.
  `staleDate` = fin du repos. La notification « Repos terminé » est conservée.
- **Composant isolé** (`'widget'`) : il ne peut rien importer, couleurs (tokens) et textes (i18n)
  passés en props ; police système arrondie (Barlow n'est pas embarquée dans l'extension).

## Séance démarrée sur un autre appareil (branche `fix/seance-autre-appareil`)

- L'état de l'écran de séance (`workout_state` : plan, brouillons, repos) est **local** et n'est
  pas synchronisé. Une séance en cours synchronisée depuis un autre appareil affichait « Cette
  séance est terminée » sans issue. L'état est maintenant **reconstruit** à l'ouverture : plan de
  la séance type si les séries déjà faites y correspondent, sinon exercices des séries faites
  (repos 2 min, sans cible de reps). Les brouillons et le repos en cours ne sont pas repris.
- Écran de secours (séance vraiment introuvable) : marge haute explicite et bouton « Retour à
  l'accueil ».

## Marges des écrans plein écran (branche `fix/marges-plein-ecran`)

- Retour de séance (1.1.0) : en séance, les boutons du haut passaient sous l'heure et « Valider la
  série » sous la barre d'accueil. `SafeAreaView` mesure les marges sur la vue elle-même, encore
  hors écran pendant l'animation d'ouverture d'une modale plein écran : il garde parfois 0.
- **`FullScreen`** (design system) : marges prises sur la fenêtre (`useSafeAreaInsets`). Utilisé
  par l'écran de séance, le récap de fin et `KeyboardScreen` (connexion, inscription, onboarding,
  formulaires d'exercice et de séance type). Les onglets gardent `SafeAreaView` (pas de modale).

## Android, première version (branche `android/premiere-version`)

- **Distribution par APK** à quelques amis (pas de Play Store pour l'instant : la sortie publique
  d'un compte personnel exige 12 testeurs pendant 14 jours). Les mises à jour JavaScript arrivent
  par EAS Update comme sur iOS ; un changement natif demande de renvoyer un APK.
- **Signature** : clé `~/surcharge-release.keystore` (alias `surcharge`), mots de passe dans
  `~/.gradle/gradle.properties` (`SURCHARGE_*`), hors du dépôt ; plugin
  `plugins/withAndroidReleaseSigning.js`. SHA-1 `01:42:D2:…:11:9D` déclarée dans un client OAuth
  Android (Google Cloud) pour la connexion Google.
- **APK arm64 seulement** (`-PreactNativeArchitectures=arm64-v8a`) : ~75 Mo au lieu de 180.
- **JDK 17** (Homebrew `openjdk@17`) pour Gradle : le JDK 25 d'Android Studio fait échouer la
  configuration CMake des modules natifs.
- Apple masqué hors iOS (déjà en place) ; Live Activity : module iOS seulement (stub Android).

## Correctifs 1.0.x → 1.1.0

- **Couleur des titres** : `Heading` prend `tone` (`text` / `onVolt` / `volt`) ; une classe de
  couleur passée par `className` ne l'emportait pas (ordre des classes non garanti). Titres de la
  carte volt de l'accueil en `onVolt`.
- **Pré-remplissage** (retour de salle, exercice fait pour la première fois) : même série à la
  dernière séance > dernière série validée **dans la séance du jour** > dernière série de la
  dernière séance > cible. Johan veut garder la priorité à « la même série la séance d'avant ».
- **Carte Progression de l'accueil** : avec une seule séance, texte « apparaît à partir de 2
  séances » au lieu d'une barre pleine largeur.
- **Planning** : un jour sans séance prévue mais avec une séance faite affiche son nom et « Hors
  planning » (semaine et mois), au lieu de « Repos ✓ Faite ».
- **Pluriels** des tuiles de l'accueil (« 1 séance », « 1 record »).

## Sécurité (Security Advisor Supabase, 06/10/2026)

- Revue : requêtes paramétrées partout (Supabase JS, Drizzle), RLS sur toutes les tables et le
  bucket, aucune clé secrète dans l'app, Edge Function limitée au compte appelant.
- **Migration `0004`** : `handle_new_user()` (security definer) n'est plus exécutable par `anon` /
  `authenticated` ; le trigger d'inscription fonctionne toujours (testé sur PGlite).
- Longueur minimale du mot de passe portée à 8 côté Supabase (comme l'app).
- Restent volontairement : « Leaked Password Protection » (offre payante), inscription sans
  confirmation d'e-mail, session en AsyncStorage (standard Supabase, sandbox iOS).

## App Store (1.0.0 et 1.1.0)

- **Compte de démo** `demo.surcharge@johanpoyet.fr`, rempli par `supabase/demo/seed-demo.sql`
  (10 semaines Push / Pull / Legs, pesées ; refuse de tourner deux fois), à lancer après
  l'onboarding du compte.
- **Captures** prises sur simulateur iPhone 18 Pro Max (barre d'état 9:41 via `simctl status_bar`),
  envoyées au format **6,5" (1284 × 2778)** exigé par App Store Connect ; photo d'exercice
  Unsplash (licence libre).
- **Première soumission refusée en « 2.1 Information Needed »** (compte développeur sans
  historique) : réponse = vidéo d'écran sur iPhone (inscription → séance → déconnexion →
  suppression de compte) + 6 réponses écrites (`docs/app-store/reponse-review.md`), recopiées dans
  les Notes de vérification pour les versions suivantes. Acceptée ensuite.
- Statut DSA : **non commerçant** ; dispositif médical réglementé : non ; classification 4+.
- 1.0.0 en publication manuelle (sortie le 06/10/2026) ; 1.1.0 en publication automatique.
- Toujours **soumettre un build qui contient lui-même les correctifs** (les vérificateurs
  d'Apple n'ont pas la mise à jour OTA au premier lancement).

## Outillage et contournements

- **Builds iOS en local** (Xcode archive + export) au lieu d'EAS Build / Submit : la file gratuite
  d'EAS a pris 1 à 2 h. Le compteur de builds d'EAS n'est donc pas à jour
  (`eas build:version:set` si on revient à EAS Build).
- **Sentry en local** : `SENTRY_DISABLE_AUTO_UPLOAD=true` pour les builds de test ; le build
  d'archive envoie source maps + dSYM (jeton dans `.env.sentry-build-plugin`).
- **Rendu sur simulateur pour vérifier un écran** : build Release + `simctl io screenshot`
  (DeviceHub sous Xcode 27 ne gère pas le glisser-déposer : `simctl addmedia` pour les photos).


## V2 — Phase 0 (sécurisation, 06/10/2026)

- **Supabase dev** : projet `surcharge-dev` (`bmstymcjxpustfzyjxpy`, Paris), organisation passée en
  Pro (offre gratuite limitée à 2 projets actifs). `.env` pointe vers le dev ; les clés de prod sont
  dans `.env.production` (ignoré par git, jamais lu par l'assistant). CLI liée au dev. Migrations
  `0001` à `0004`, bucket `exercise-photos` et Edge Function `delete-account` recréés sur le dev ;
  auth E-mail / Apple / Google recopiée de la prod. Pas de SMTP Resend sur le dev (SMTP par défaut
  de Supabase, envoi limité aux membres de l'organisation).
- **Piège `.env.production`** : Expo le charge (avant `.env`) dès que le bundle est fait en mode
  production : build Release, TestFlight, `eas update`. Un build Release de la V2 se connecterait
  donc à la prod. Pour tester la V2 en Release, exporter d'abord les variables de `.env` dans le
  shell (elles passent avant les fichiers).
- **Tag `v1.1.0`** sur `3ad2416` : code du build iOS 7 (rien n'a changé dans `src/`, `app/` ni
  `package.json` depuis le correctif des marges `4b1d52a`) et de l'APK Android 1.1.0 ; contient le
  script OTA iOS + Android. Point de départ des branches `hotfix/…`.
- **Mise à jour forcée : absente de la 1.1.0** → Phase A nécessaire. Au tag `v1.1.0` : ni table
  `app_config` ni `min_supported_version`, aucune lecture de version, aucun écran « mettre à
  jour » ni lien vers les stores. `expo-updates` est en configuration par défaut (`app.json` :
  `checkAutomatically: ON_LOAD`, `fallbackToCacheTimeout: 0`, aucun appel `Updates.*`) : il applique
  les OTA au lancement suivant sans jamais bloquer.
- **Piste pour la Phase A** : la 1.1.0 reçoit les OTA (runtime `1.1.0`, canal `production`) et
  embarque déjà le module natif `expo-application` (dépendance indirecte, présent dans
  `ios/Podfile.lock`). L'écran de mise à jour forcée pourrait donc lui être livré par OTA en plus
  de la 1.2.0 (sous réserve de l'accord de Johan pour `eas update`). La 1.0.0 n'a pas
  `expo-updates` : ses utilisateurs ne pourront jamais être forcés.

## Mise à jour forcée (1.2.0, Phase A de la V2)

- **Table `app_config`** (`0005_app_config.sql`) : `key` / `value jsonb`, lecture pour `anon` et
  `authenticated`, aucune écriture depuis l'app (réglée dans le tableau de bord). Valeur de départ
  `min_supported_version = "1.0.0"` (rien n'est bloqué).
- **Vérification** au démarrage et à chaque retour au premier plan (`useUpdateRequired`), en
  comparant `Application.nativeApplicationVersion` (version du binaire, pas celle d'une OTA) à
  `min_supported_version`. **Jamais de blocage** hors ligne, en cas d'erreur, de version
  illisible ou de table absente (une base sans la migration laisse l'app fonctionner).
- **Écran bloquant** à la place de toute la navigation (une séance en cours reste dans SQLite et
  reprend après la mise à jour). iOS : bouton vers la fiche App Store. Android : pas de Play
  Store (APK distribué à la main), seulement la consigne d'installer la dernière version.
- **Version unique** pour iOS et Android (les deux plateformes ont les mêmes numéros).
- `expo-application` ajouté en dépendance directe (§9 de SPEC_V2) à la **même version** (57.0.3)
  que celle déjà embarquée via `expo-notifications` : aucun changement natif.
- **Livré dans la 1.1.0 plutôt qu'en 1.2.0** (06/10/2026) : la 1.1.0 était encore en vérification ;
  Johan l'a retirée et resoumise avec le **build 8** (code de `release/1.1.0`, version 1.1.0) et
  un APK `versionCode` 2. Tous les utilisateurs qui passent à la 1.1.0 ont donc l'écran ; pas
  d'OTA nécessaire. `release/1.2.0` est devenue inutile (le passage en 1.2.0 reste dans `v2`).
  Migrations `0004` (absente de l'historique de la prod, rejouable) et `0005` appliquées en prod.

## V2 — Phase B (modèle de données multi-sport)

- **Migration serveur `0006_multisport.sql`** (la `0002` de SPEC_V2, renumérotée : `0002` à
  `0005` existaient déjà). Testée sur PGlite avec une simulation de Supabase (rôles, `auth.uid()`,
  `moddatetime`, `storage`) et un jeu de données V1 : reprise, reprise rejouée, écriture d'une
  ancienne version, RLS entre deux comptes, suppression de compte en cascade.
- **Écarts avec le SQL de SPEC_V2 §3** :
  - le bloc Musculation repris d'une séance type a **l'id de la séance type** (au lieu de
    `gen_random_uuid()`) : la reprise locale de chaque appareil retombe sur la même ligne, sans
    doublon, y compris pour une séance type créée plus tard par une ancienne version ;
  - le bloc d'une séance type supprimée est créé supprimé ;
  - triggers `set_updated_at_insert` (0003) et index `(user_id, updated_at)` ajoutés aux deux
    nouvelles tables, comme pour les autres tables synchronisées ;
  - `reps` reste aussi obligatoire : 0 pour une série sans reps (course, temps, calories).
- **Compatibilité des anciennes versions** : leur pull ne lit que les colonnes qu'elles
  connaissent ; leur push (upsert PostgREST) n'envoie que les leurs, donc ne remet jamais
  `block_id` à null. Un exercice ajouté à une séance type par une ancienne version arrive sans
  `block_id` : la reprise locale V2 le rattache au bloc Musculation.
- **Reprise locale** (`upgradeLocalData`), idempotente, lancée **après chaque pull** (et envoyée
  dans la foulée) : bloc Musculation pour les séances types sans bloc, rattachement des exercices
  sans bloc, `catalog_key` des exercices par défaut retrouvés par leur nom d'origine (un exercice
  renommé reste « perso »), catalogue des disciplines du profil autres que la muscu. Les séries V1
  restent sans `block_id` (bloc Musculation implicite à l'affichage).
- **Catalogue** : clés canoniques pour les 34 exercices par défaut (`bench_press`, `squat`…),
  5 exercices de course, 10 de cross-training, 9 Hyrox (course + 8 stations). Identifiants
  **déterministes** (`stableId(user, 'exercise', clé)`, UUID v8 calculé par FNV-1a) pour que deux
  appareils hors ligne ne créent pas de doublon. Le catalogue d'une discipline n'est ajouté que
  quand elle est choisie (profil) : pas d'exercices Hyrox dans la bibliothèque d'un pratiquant de
  muscu (SPEC_V2 §5.5 : les disciplines filtrent le catalogue).
- **Charges Hyrox** (`src/features/hyrox/catalog.ts`), **vérifiées par Johan sur hyrox.com le 06/10/2026** :
  Sled Push 102 / 152 / 152 / 202 kg (Open F / Open H / Pro F / Pro H, traîneau compris),
  Sled Pull 78 / 103 / 103 / 153 kg, Farmers 2 × 16 / 24 / 24 / 32 kg, Sandbag 10 / 20 / 20 / 30 kg,
  Wall Balls 4 / 6 / 6 / 9 kg. Doubles : charges Open Homme par défaut ; « custom » : pas de charge.
- **Éditeur V1 des séances types** : en attendant les éditeurs de blocs (Phase D), tous ses
  exercices vont dans le bloc Musculation. ⚠️ Phase D : `setTemplateExercises` remplace toutes
  les lignes d'une séance type, il devra être limité à un bloc.

## V2 — Phase C (exercices et types de suivi)

- **Formulaire d'exercice** : la maquette `exercice-type-suivi` ne montre que le nom, le type de
  suivi, l'aperçu et la discipline. Les champs V1 (photo, muscle, équipement, pas, note) sont
  gardés (même formulaire pour tous les exercices) ; ordre : photo, nom, type de suivi, aperçu,
  discipline, muscle, équipement, pas (seulement pour les types avec charge), note. Muscle et
  équipement restent obligatoires (colonnes `not null`) : « Autre » est présélectionné quand on
  choisit une discipline autre que la muscu. Disciplines proposées : les 4 de la maquette.
- **Verrouillage du type de suivi** : désactivé avec une explication dans le formulaire **et**
  ignoré par `updateExercise` si l'exercice a une série non supprimée.
- **Records par type** (`src/features/exercises/tracking.ts`) : distance + temps = meilleur temps
  sur la **distance de référence** (la plus pratiquée, à égalité la plus longue) ; temps = plus
  longue durée ; reps = plus de reps ; calories = plus de calories ; charge + distance = plus
  grosse charge, à égalité plus longue distance. Les séries « échec » ne comptent pas.
- **Détail** : « Charge × reps » garde l'écran V1 à l'identique. Autres types : tuiles Record /
  Allure (course) ou Dernière fois / Séances, courbes Temps · Allure · Distance (course), Durée,
  Reps max, Calories, Charge · Distance ; pas de bloc de ressenti ni de conseil (V2 : conseil de
  charge seulement en charge × reps).
- **Bibliothèque** : valeur de la dernière séance selon le type (meilleure allure, durée, reps,
  calories, charge portée) et tendance dans le sens du progrès (↑ = allure plus rapide…).
- ⚠️ La saisie des séries non « charge × reps » arrive en Phase E : d'ici là, un tel exercice
  ajouté à une séance type serait saisi en kg × reps par l'écran V1 (build de dev uniquement).

## V2 — Phase D (séances types en blocs)

- **Éditeur** (maquettes `seance-multi-blocs`, `ajouter-bloc`) : une séance neuve commence par un
  bloc Musculation vide (le cas le plus courant, comme en V1). Le bloc Musculation embarque
  l'éditeur V1 dans sa carte (SPEC_V2 §5.1) ; les autres blocs montrent un résumé et s'éditent
  dans une modale (`templates/block`). Les modifications vont dans le brouillon et ne sont
  enregistrées qu'avec « Enregistrer la séance ».
- **Feuille « Ajouter un bloc »** : les 4 choix de la maquette **plus « Échauffement »** (absent de
  la maquette, nécessaire pour « Simu Hyrox » et prévu par SPEC_V2 §4.2).
- **Ordre des blocs** : glisser-déposer par une poignée ⋮⋮ à gauche de l'étiquette, comme les
  exercices (demande de Johan ; d'abord fait par le menu ⋯). Chaque poignée a son propre geste :
  la liste des exercices du bloc Musculation, imbriquée, ne gêne pas. Monter / Descendre restent
  disponibles pour VoiceOver sur la poignée. Menu ⋯ : Modifier (ou Renommer pour la muscu),
  Dupliquer, Supprimer (confirmation).
- **Hyrox** : les segments sont générés depuis le catalogue (`hyroxSegments`), sans lignes
  `template_exercises`. Demi = les 4 premières stations ; station seule = sans course ;
  catégorie « Libre » = pas de charges. Enregistrer un bloc Hyrox ajoute les exercices Hyrox du
  catalogue à la bibliothèque (le moteur de séance s'appuie dessus).
- **Course / cardio** : « 6 × 400 m, récup 1:30 » = une ligne `template_exercises` (séries,
  distance ou durée cible, repos). `CardioConfig.intervals` (SPEC_V2 §4.2) n'est pas utilisé.
- **Circuit** : les mouvements d'un tour sont des lignes `template_exercises` (1 série, cible
  reps / distance / calories / durée selon le type de suivi) ; format et paramètres dans `config`.
- **Configs validées avec zod** à la lecture (`parseBlockConfig`) : invalide → valeur par défaut.
- **Positions des exercices** continues d'un bloc à l'autre : une ancienne version affiche les
  exercices d'une séance type V2 dans l'ordre de la séance.
- **Durée estimée** (SPEC_V2 §4.6) : course sans durée cible comptée à 6:00 /km ; Hyrox à durée
  fixe (la moyenne de l'utilisateur viendra avec l'historique, Phase F). Affichée « ~1 h 30 »
  partout (éditeur, Mes séances, planning, accueil). « X km de course » = courses Hyrox + exercices
  de la discipline Course des blocs cardio.
- **En attendant le moteur multi-blocs (Phase E)**, l'écran de séance V1 ne démarre que les
  exercices des blocs Musculation d'une séance type.

## V2 — Phase E (moteur de séance multi-blocs)

- **Démarrage** : une séance type crée une ligne `session_blocks` par bloc (config copiée,
  `template_block_id`) et un plan figé où chaque ligne connaît son bloc. Un bloc Hyrox donne une
  ligne par segment (exercice Hyrox du catalogue, distance, charge de la division). L'ordre des
  lignes est l'`exercise_order` des séries : unique dans la séance. Une séance V1 en cours au
  moment de la mise à jour garde son état (un seul bloc Musculation implicite).
- **Chronos** : uniquement des horodatages (début, pause, total des pauses) persistés dans
  `workout_state` ; temps d'un segment ou d'un bloc = maintenant − début − pauses. Juste après une
  fermeture forcée, en arrière-plan et après une pause.
- **Blocs minutés** (échauffement, Hyrox, circuit) : écran d'intro avec « Démarrer le bloc » (le
  chrono part au tap, pas à l'ouverture), « Passer ce bloc », Pause / Reprendre dans l'en-tête
  (panneau avec Reprendre, Terminer le bloc, Terminer la séance), puis « Bloc terminé » avec le
  résultat et « Bloc suivant ». Les blocs Musculation et Course gardent « Terminer » dans l'en-tête.
- **Hyrox** : un tap enregistre le segment (`session_sets` : `duration_s`, distance, charge de la
  division en `weight_kg`, reps des wall balls, `block_id`). Transitions chronométrées : tap
  « J'arrive à la station » avant chaque station, temps gardés dans l'état puis dans
  `result.transitionsS`. Annulation du dernier tap pendant 5 s (bandeau « Annuler » au-dessus du
  bouton, à la place du toast : il reste à portée du pouce). Barre de 16 cases : le segment en
  cours est à moitié rempli.
- **Comparaison** (SPEC_V2 §4.5) : `lastBlock` = dernier bloc terminé du même bloc de séance type,
  sinon même type et même config ; écart par segment et en direct, avec le signe −/+.
- **Circuits** : AMRAP (+1 tour / −, reps du tour entamé à la fin → `{rounds, extraReps}`), For
  Time (`{totalS, capped}`), EMOM / Tabata (`{completedRounds}`, 0 tour de repos après le dernier
  effort Tabata). Les mouvements d'un tour n'ont pas de séries enregistrées.
- **Signaux** : bip (`expo-audio`, SPEC_V2 §9) + vibration à chaque changement d'intervalle au
  premier plan ; notifications locales programmées pour l'arrière-plan (au plus 60, limite iOS),
  annulées en pause et reprogrammées à la reprise. Bips générés pour l'app (`assets/sounds/`).
  Plugin `expo-audio` **sans micro, sans enregistrement Android, sans lecture en arrière-plan**
  (pas de permission inutile pour la vérification Apple). Lecture même en mode silencieux,
  mélangée à la musique.
- **Cardio** : le chrono de la série part et s'arrête d'un tap ; l'arrêt enregistre la série
  (distance réglable, durée, allure affichée) puis lance la récup. Calories / reps : stepper.
- **Fin de séance** : les blocs commencés sont fermés avec ce qui a été fait (Hyrox partiel) ; une
  séance sans séries mais avec un bloc terminé (circuit) n'est plus supprimée.
- ⚠️ **Stats (Phase F)** : les records et le volume V1 ne tiennent pas encore compte du type de
  suivi (ex. wall balls 6 kg × 100 compté comme une série de muscu). Le récap V1 s'affiche en fin de
  séance en attendant les récaps Hyrox / circuit / cardio.

## V2 — Phase F (récaps et stats multi-sport)

- **Stats par type de suivi** (`src/features/stats/typed.ts`) : records (accueil, calendrier,
  profil, records battus en séance) selon le type ; pour la course, sur la même distance. Le
  volume, le 1RM et la carte Progression ne comptent que les séries « charge × reps ». Les séries
  sont lues avec le type de suivi de leur exercice (jointure `exercises`).
- **Récap de fin de séance** : récap de chaque bloc terminé (Hyrox, circuit, cardio), puis la
  partie musculation V1 (durée, volume, séries, records) s'il y en a. Une séance de musculation
  seule s'affiche comme en V1.
- **Récap Hyrox** (maquette `recap-hyrox`) : temps total, badge « Record −X:XX » contre le meilleur
  temps des simus précédentes du même bloc (ou même config), tuiles Course (allure moyenne) /
  Stations / Transitions (si mesurées), barres par station avec l'écart avec la dernière simu, la
  station la plus en retard en orange, **point faible** = plus gros retard > 10 s avec « Ajouter le
  bloc » (bloc Hyrox « station seule » de la même catégorie, ajouté à la fin de la séance type).
- `session_blocks.result.splits` (Hyrox) : temps de chaque segment dans l'ordre (ajout au format
  de SPEC_V2 §4.4, sans effet sur les anciennes versions). Sert au récap et à la comparaison.
- **Partager** : texte du récap via la feuille de partage native (`Share` de React Native, aucune
  dépendance) ; l'image stylée est en V2.1 (SPEC_V2 §8).
- **Accueil** : course dans les disciplines → tuile « km courus en <mois> » (exercices de la
  discipline Course + courses Hyrox), stats en grille 2 × 2 ; Hyrox → carte « Meilleure simu
  Hyrox » (simus complètes : meilleur temps et courbe). La carte « Séance du jour » résume les
  blocs d'une séance multi-sport (« Hyrox complet · 8 km + 8 stations · 2 exercices »).
- **Disciplines** : section « Tes disciplines » dans l'écran d'onboarding (au lieu d'un écran de
  plus : l'onboarding reste en 2 étapes) ; feuille unique au premier lancement de la V2 pour les
  comptes existants (indicateur local `AsyncStorage`, par appareil) ; réglage « Disciplines » dans
  le profil. Choisir une discipline ajoute son catalogue d'exercices.
- Non fait : durée estimée d'un bloc Hyrox d'après la moyenne de l'utilisateur (SPEC_V2 §4.6,
  « dès qu'il a un historique ») : durées fixes gardées.

## Retours des testeurs de la 2.0.0

- **Catalogue d'exercices étendu** (« pas assez d'exercices ») : 136 exercices pour tous (les 34
  d'origine, 94 de musculation en plus, 8 machines de cardio), plus 11 de course et 27 de
  cross-training selon les disciplines. Ajoutés à la bibliothèque des nouveaux comptes et des
  comptes existants (reprise locale après chaque pull : les ajouts futurs au catalogue arrivent de
  la même façon). Un exercice perso du même nom (même supprimé) n'est pas doublé : il est rattaché
  au catalogue ; un exercice du catalogue supprimé n'est pas remis. Pas de catégorie
  « kettlebell » : équipement « Autre ». « SkiErg » n'existe que dans le catalogue Hyrox.
- **Séances toutes prêtes** (`src/features/templates/presets.ts`) : 18 séances (muscu débutant et
  intermédiaire, PPL, haut / bas du corps, Hyrox complet / demi / stations, course, AMRAP, EMOM,
  Tabata, For Time), données dans le code, exercices désignés par leur clé du catalogue.
  « Ajouter à mes séances » crée une **copie** ordinaire (modifiable, sans lien avec le
  catalogue) : exercices manquants ajoutés, exercices supprimés restaurés, nom rendu unique
  (« Push 2 »). Accès : bandeau en haut de « Mes séances » et bouton de l'état vide.
- **Bloc Muscu et types de suivi** : un bloc Musculation ne note que charge × reps (et reps
  seules). Un exercice de course, de temps, de calories ou charge + distance choisi pour un bloc
  Muscu va dans le bloc Course / cardio qui le suit (créé au besoin) ; la liste de choix le signale.
  Envoyé en EAS Update (runtime 2.0.0) le 08/10/2026.
- **Saisie à la main** (« je n'ai pas mon téléphone quand je cours ») : écran « Ajouter une
  sortie » (`app/log-activity.tsx`, accès depuis l'accueil si la course fait partie des
  disciplines) : activité (exercices distance + temps), distance en km, temps tapé (« 58:30 »,
  « 1:05:20 », « 1h05 »), jour (aujourd'hui par défaut, jusqu'à un an en arrière, sans sélecteur de
  date natif pour ne pas ajouter de dépendance), note. Elle crée une séance terminée avec un bloc
  cardio, son résultat et une série : historique, stats, km du mois et records la prennent en
  compte sans code dédié. Une sortie du jour finit « maintenant », une sortie passée est placée à
  midi. Pendant une séance, « Saisir le temps » remplace le chrono (temps de la montre).
- **Garde-fou d'allure** : une allure plus rapide que 2:00 /km en course (0:40 /km pour le reste)
  demande confirmation (« Corriger » / « Enregistrer quand même »), au chrono comme à la saisie,
  pour ne pas fausser les records par une faute de frappe ou un chrono oublié.
