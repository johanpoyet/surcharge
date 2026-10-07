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

Prises sur le simulateur « iPhone 18 Pro Max » (1320 × 2868), puis réduites au format
**6,5" (1284 × 2778)** demandé par App Store Connect (Apple les réutilise pour toutes les tailles).
Ordre envoyé pour la 1.0.0 : séance en cours, accueil, détail exercice (photo Unsplash, licence
libre), planning, bibliothèque, profil.

## Soumission 1.0.0 (1er octobre 2026)

- Build **1.0.0 (4)**, version **1.0.0**, publication **manuelle** après validation.
- Dispositif médical réglementé : **Non**. Statut DSA : **non commerçant** (app gratuite, sans
  revenus) — à repasser en commerçant si abonnement ou publicité.
- Compte démo à ne pas modifier pendant la vérification (mot de passe, données).

## Avant publication dans l'UE

App Store Connect demandera le statut de **professionnel (trader)** au sens du DSA. Si oui, adresse
et téléphone affichés publiquement sur la fiche.

## Version 1.1.0 (build 6)

### Nouveautés (« What's New », 4000 caractères max)

```
Ton chrono de repos te suit partout.

• Chrono de repos dans la Dynamic Island et sur l'écran verrouillé : quitte l'app pendant ton repos, le compte à rebours reste visible. Un appui te ramène à ta séance.
• Première fois sur un exercice : chaque série reprend la charge et les répétitions de la précédente, plus besoin de tout remonter.
• Une séance commencée sur un autre appareil se reprend sans souci.
• Petites corrections sur l'accueil.

Bonnes séances !
```

### Vérification d'Apple

Notes inchangées (compte démo, réponse « Information Needed » du 02/10/2026). Ajouter en fin de
notes :

```
New in 1.1.0: during a workout, the rest timer is shown as a Live Activity (Dynamic Island and Lock Screen) after a set is validated. It is started and ended locally by the app (no push notifications) and tapping it reopens the current workout.
```


## Version 2.0.0 (multi-sport) — textes proposés, à valider par Johan

Le **nom** ne change pas (« Surcharge : carnet de muscu », bon pour le référencement). Le sous-titre,
les mots-clés et le texte promotionnel annoncent le multi-sport.

| Champ | Valeur | Limite |
|---|---|---|
| Sous-titre | Muscu, course, Hyrox et WOD | 27 / 30 |
| Mots-clés | musculation,muscu,hyrox,wod,course,running,amrap,emom,séance,salle,gym,force,progression,cardio | 95 / 100 |
| Texte promotionnel | Muscu, course, circuits et simus Hyrox dans un seul carnet : note chaque série en un tap, même sans réseau, et vois ta progression. | 131 / 170 |

« CrossFit » est une marque déposée : on ne l'emploie pas (« cross-training », « WOD » à la place).

### Nouveautés (« What's New »)

```
Surcharge devient multi-sport : muscu, course, circuits et Hyrox dans un seul carnet.

• Séances en blocs : enchaîne échauffement, muscu, course, circuit et Hyrox dans la même séance. Glisse les blocs pour les réordonner.
• Hyrox : simu complète, demi ou station seule, avec les charges officielles de ta catégorie. Un seul gros bouton par segment, l'écart avec ta dernière simu en direct, et un récap qui montre ton point faible.
• Circuits : AMRAP, EMOM, For Time et Tabata, avec un bip à chaque intervalle.
• Course et cardio : chrono d'un tap par série, allure calculée, récup automatique.
• Chaque exercice a son type de suivi (charge × reps, distance + temps, temps, reps, calories…) avec ses records et ses courbes.
• Choisis tes disciplines : l'accueil affiche tes km courus du mois et ta meilleure simu Hyrox.
• Ta version de l'app est affichée en bas du profil.

Toujours hors ligne, toujours sans publicité. Bonnes séances !
```

### Description (remplace la précédente)

```
Surcharge, c'est ton carnet d'entraînement : muscu, course, circuits et Hyrox. Note chaque série en quelques secondes et vois clairement ta progression.

PENSÉ POUR LA SALLE
• Charge et répétitions avec de gros boutons + / −, appui long pour aller vite
• Chaque série est pré-remplie avec ta dernière séance : valider une série, c'est un tap
• Chrono de repos automatique, visible dans la Dynamic Island et sur l'écran verrouillé
• Fonctionne hors ligne : pas besoin de réseau au sous-sol de la salle
• Écran toujours allumé pendant la séance, reprise automatique si l'app se ferme

MULTI-SPORT
• Séances en blocs : échauffement, muscu, course, circuit et Hyrox dans la même séance
• Hyrox : simu complète, demi ou station seule, charges officielles par catégorie, un tap par segment, écarts en direct avec ta dernière simu et récap avec ton point faible
• Circuits : AMRAP, EMOM, For Time et Tabata, avec un bip à chaque intervalle
• Course et cardio : distance, temps et allure, chrono d'un tap, récup automatique

PROGRESSE POUR DE VRAI
• Ressenti de chaque série : facile, moyen, difficile, échec
• Conseil de charge : « Tout était facile la dernière fois : vise 82,5 kg »
• Records selon le type d'exercice : charge, meilleur temps, durée, reps, calories
• Courbes de progression, 1RM estimé, calendrier de régularité, km courus, poids corporel

ORGANISE TA SEMAINE
• Crée tes séances types et place-les dans ta semaine
• L'accueil te propose la bonne séance chaque jour
• Change une séance juste pour un jour, sans toucher au reste du planning
• Rappel le matin des jours de séance

TES EXERCICES, TES MACHINES
• Exercices de muscu, de course, de cross-training et stations Hyrox prêts à l'emploi
• Ajoute les tiens avec une photo de la machine pour la reconnaître d'un coup d'œil

TES DONNÉES T'APPARTIENNENT
• Synchronisées sur tous tes appareils, hébergées en France
• Aucune publicité, aucun traçage
• Export CSV de toutes tes séances, suppression du compte en un geste

Surcharge est gratuite.
```

### Confidentialité

Questionnaire **inchangé** : pas de nouvelle donnée collectée (les séances multi-sport restent des
données de forme physique), pas de micro (les bips sont joués par l'app, sans permission).

### Vérification d'Apple

Compte démo enrichi avant la soumission (`supabase/demo/seed-demo-v2.sql` : séance « Simu Hyrox »
au planning, deux simus terminées, un AMRAP, une course). Ajouter en fin de notes :

```
New in 2.0.0 (multi-sport): on first launch, a sheet asks which sports you practice (the demo account already has strength, running, cross-training and Hyrox: just tap "Valider"). The Home tab then shows the kilometres run this month and a "Meilleure simu Hyrox" card (two Hyrox simulations are already in the history). In the Workouts tab ("Séances" → "Mes séances"), "Simu Hyrox" is a workout made of blocks (warm-up, Hyrox, strength): tap it, then "Démarrer". For each block tap "Démarrer le bloc"; during the Hyrox block, tap the large button once per segment (the last tap can be undone for 5 seconds). At the end, the recap compares each station with the previous simulation. "WOD" is a 12-minute AMRAP circuit: a short beep plays at the end (no microphone or other permission is used).
```

### Captures (facultatif)

Ajouter 2 ou 3 captures multi-sport (prises avec le compte démo) : séance Hyrox en cours, récap
Hyrox, séance type en blocs.
