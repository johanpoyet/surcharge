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
  (reps max, sinon min, sinon 10) avec 20 kg pour une barre et 0 sinon.
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
  limitation connue de la V1.

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
