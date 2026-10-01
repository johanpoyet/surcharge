# Fiche App Store — Surcharge

Textes prêts à coller dans **App Store Connect** (longueurs vérifiées).

## Informations générales

| Champ | Valeur | Limite |
|---|---|---|
| Nom | Surcharge : carnet de muscu | 27 / 30 |
| Sous-titre | Chaque série, chaque progrès | 28 / 30 |
| Catégorie principale | Santé et forme | |
| Catégorie secondaire | Sport | |
| Prix | Gratuit | |
| Classification par âge | 4+ (aucun contenu sensible) | |
| E-mail de contact | surcharge@johanpoyet.fr | |
| URL de confidentialité | https://johanpoyet.fr/surcharge/confidentialite | obligatoire |
| URL d'assistance | https://johanpoyet.fr/surcharge/support | obligatoire |
| Copyright | 2026 Johan Poyet | |
| Identifiant (bundle) | fr.johanpoyet.surcharge | |
| Chiffrement | Non (HTTPS uniquement, déjà déclaré dans l'app) | |

## Texte promotionnel (modifiable sans nouvelle version, 140 / 170)

Note chaque série en quelques secondes, même sans réseau à la salle, et vois enfin clairement ta progression : records, charges, régularité.

## Mots-clés (96 / 100, séparés par des virgules, sans espaces)

musculation,muscu,entraînement,séance,salle,gym,force,progression,haltères,programme,poids,sport

## Description

Surcharge, c'est ton carnet de muscu : note chaque série en quelques secondes et vois clairement ta progression.

PENSÉ POUR LA SALLE
• Charge et répétitions avec de gros boutons + / −, appui long pour aller vite
• Chaque série est pré-remplie avec ta dernière séance : valider une série, c'est un tap
• Chrono de repos automatique, avec une notification quand il est temps d'y retourner
• Fonctionne hors ligne : pas besoin de réseau au sous-sol de la salle
• Écran toujours allumé pendant la séance, reprise automatique si l'app se ferme

PROGRESSE POUR DE VRAI
• Ressenti de chaque série : facile, moyen, difficile, échec
• Conseil de charge : « Tout était facile la dernière fois : vise 82,5 kg »
• Records personnels, 1RM estimé, courbes de charge, de volume et de répétitions
• Calendrier de régularité, séances du mois, poids corporel

ORGANISE TA SEMAINE
• Crée tes séances types (Push, Pull, Legs…) et place-les dans ta semaine
• L'accueil te propose la bonne séance chaque jour
• Change une séance juste pour un jour, sans toucher au reste du planning
• Rappel le matin des jours de séance

TES EXERCICES, TES MACHINES
• Une trentaine d'exercices courants prêts à l'emploi
• Ajoute les tiens avec une photo de la machine pour la reconnaître d'un coup d'œil

TES DONNÉES T'APPARTIENNENT
• Synchronisées sur tous tes appareils, hébergées en France
• Aucune publicité, aucun traçage
• Export CSV de toutes tes séances, suppression du compte en un geste

Surcharge est gratuite.

## Nouveautés de la version (première version)

Première version de Surcharge : séances, planning, chrono de repos, conseils de charge, records et graphiques de progression. Bonnes séances !

## Confidentialité de l'app (questionnaire App Store Connect)

**Traçage** : Non — l'app ne trace pas les utilisateurs.

Données collectées, toutes **liées à l'identité** de l'utilisateur, **non utilisées pour le
traçage**, finalité **Fonctionnalités de l'app** uniquement :

| Catégorie Apple | Type | Détail |
|---|---|---|
| Coordonnées | Adresse e-mail | compte |
| Coordonnées | Nom | prénom |
| Santé et forme | Santé | poids corporel |
| Santé et forme | Forme physique | séances, séries, exercices |
| Contenu utilisateur | Photos ou vidéos | photos des machines |
| Contenu utilisateur | Autre contenu | notes, noms de séances |
| Identifiants | Identifiant utilisateur | identifiant du compte |

Plus une donnée **non liée** à l'identité (Sentry, sans identifiant ni IP), non utilisée pour le
traçage, finalité **Fonctionnalités de l'app** :

| Catégorie Apple | Type | Détail |
|---|---|---|
| Diagnostic | Données de plantage | rapports Sentry |

## Informations pour la vérification d'Apple

La connexion est obligatoire : fournir un **compte de démonstration** avec quelques séances.

- Identifiant : `demo.surcharge@johanpoyet.fr`
- Mot de passe : choisi par Johan, saisi seulement dans App Store Connect (pas dans le dépôt).
- Données : `supabase/demo/seed-demo.sql` (10 semaines de Push / Pull / Legs, pesées), à lancer
  une fois dans le SQL Editor de Supabase après l'onboarding du compte.
- Note (en anglais pour l'équipe de vérification) : « Sign in with the demo account (email +
  password). It contains 10 weeks of workout history. Start today's workout from the Home tab or
  the Workouts tab. The app works offline. Account deletion: Profile → Delete my account. »

## Captures d'écran

Obligatoires : iPhone 6,9" (1320 × 2868 px), au moins 3, jusqu'à 10. Suggestion d'ordre :
1. Séance en cours (série active, ressenti, chrono)
2. Accueil (séance du jour, régularité)
3. Détail exercice (courbe de progression, records)
4. Planning de la semaine
5. Bibliothèque d'exercices avec photos
6. Profil (poids corporel, records)

Elles peuvent être prises sur le simulateur « iPhone 18 Pro Max » avec un compte de démonstration.

## Avant publication dans l'UE

App Store Connect demandera le statut de **professionnel (trader)** au sens du DSA. Si oui, adresse
et téléphone affichés publiquement sur la fiche.
