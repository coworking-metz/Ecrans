# Écrans v2 — Spécification de refonte

> Document de conception pour la réécriture de l'application d'affichage dynamique.
> Cible : branche `v2` du dépôt.
>
> Le document décrit **ce que fait l'application** et **comment elle doit être
> structurée**. Il fige le contrat de données (identique à la v1, sauf mentions
> explicites), et détaille la refonte principale demandée : **la gestion des
> slides actifs / inactifs**.

---

## Sommaire

1. [Objectifs de la v2](#1-objectifs-de-la-v2)
2. [Contrat de données (inchangé)](#2-contrat-de-données-inchangé)
3. [Refonte n°1 — États de diffusion](#3-refonte-n1--états-de-diffusion)
4. [Refonte n°2 — Éditeur d'horaires](#4-refonte-n2--éditeur-dhoraires)
5. [Architecture applicative](#5-architecture-applicative)
6. [Cartographie des vues](#6-cartographie-des-vues)
7. [Le lecteur (mode diffusion)](#7-le-lecteur-mode-diffusion)
8. [Pilotage à distance](#8-pilotage-à-distance)
9. [Build et versionnement des assets](#9-build-et-versionnement-des-assets)
10. [Découpage du chantier](#10-découpage-du-chantier)
11. [Annexe — Évolutions de données proposées](#11-annexe--évolutions-de-données-proposées)

---

## 1. Objectifs de la v2

### Ce qui motive la réécriture

| Problème constaté en v1 | Objectif v2 |
|---|---|
| On ne sait pas, en regardant la liste, **si un slide passe réellement en ce moment** — et si non, pourquoi. Six mécanismes indépendants décident de sa diffusion. | Un **état unique, calculé et affiché**, avec son explication en clair. |
| L'interrupteur « actif » est **global** : couper un slide le coupe sur tous les écrans à la fois, sans que ce soit dit. | Activation **par écran**, et affichage explicite de la portée d'une coupure. |
| Les plages horaires se saisissent en **JSON brut**. Les options `priority` et `always`, pourtant décisives, ne sont **documentées nulle part dans l'interface**. | Éditeur **assisté**, toutes les options exposées, mode expert conservé. |
| Logique métier dispersée entre les vues, les composants et les *stores*. La règle d'éligibilité d'un slide est réécrite à deux endroits différents. | Une **couche métier unique** (`core/`), partagée entre l'administration et le lecteur. |
| Pas d'actions groupées : désactiver 10 slides = 10 clics et 10 requêtes. | **Sélection multiple** et actions en lot. |
| Rechargements de page complets pour rafraîchir une liste. | Mises à jour ciblées, état applicatif cohérent. |

### Contraintes posées

- **Même API / même base de données** que la v1. Les évolutions de schéma
  souhaitables sont regroupées en [annexe](#11-annexe--évolutions-de-données-proposées)
  et chacune doit avoir un **repli fonctionnel** si elle n'est pas appliquée.
- **JS / HTML / CSS + Bulma**. Pas de framework applicatif imposé.
- Une **étape de build** est acceptée, notamment pour produire les URLs d'assets
  en `?v=<hash du contenu>`.
- Le **lecteur** (page affichée sur les téléviseurs) doit rester le plus simple et
  le plus robuste possible : il tourne sans surveillance, parfois des semaines.

### Non-objectifs

- Pas de comptes utilisateurs individuels (le code d'accès partagé reste).
- Pas de nouveaux types de slides.
- Pas de refonte graphique du rendu des slides : le rendu diffusé doit rester
  **visuellement identique**, les contenus existants ne doivent pas bouger.

---

## 2. Contrat de données (inchangé)

### 2.1 Table `ecrans`

| Champ | Type | Rôle |
|---|---|---|
| `id` | entier | Identifiant. |
| `name` | texte | Nom de l'écran dans l'administration. |
| `slug` | texte | Identifiant court utilisé dans l'URL de diffusion. |
| `image` | texte (URL) | Visuel d'illustration de l'écran. |
| `show_side` | booléen | Activation de la barre latérale. |
| `side_url` | texte (URL) | Page web affichée dans la barre latérale. |
| `side_times` | texte (JSON) | Plages horaires d'affichage de la barre. Même format que `display_times`. |
| `playlist_on` | booléen | Activation de la playlist audio. |
| `playlist` | texte | Une URL de fichier audio par ligne. |
| `playlist_volume` | entier 0–100 | Volume de la playlist. Défaut applicatif : 50. |
| `slideSort` | tableau d'entiers | Ordre de passage des slides sur cet écran. |
| `trash` | booléen | Écran archivé (filtré à la lecture). |
| `nb_slides` | entier (lecture seule) | Nombre de slides rattachés. |

### 2.2 Table `slides`

| Champ | Type | Rôle |
|---|---|---|
| `id` | entier | Identifiant. |
| `name` | texte | Libellé de travail. |
| `type` | `default` \| `image` \| `video` \| `url` | Type de slide. |
| `duration` | entier | Durée d'affichage, en secondes. |
| `active` | booléen | Interrupteur principal de diffusion. |
| `trash` | booléen | Mise à la corbeille. |
| `publication` | horodatage | Le slide n'est pas diffusé avant cette date. |
| `expiration` | horodatage | Le slide n'est plus diffusé après cette date. |
| `display_times` | texte (JSON) | Plages horaires. Voir §4. |
| `meta` | objet JSON | Contenu du slide, selon son type. Voir §2.3. |
| `created_at` / `updated_at` | horodatage | Traçabilité. |

> **Pièges à conserver.** `display_times` peut valoir la **chaîne** `"null"`,
> à traiter comme vide. `meta` peut être absent : le normaliser en objet vide à la
> lecture. Ces normalisations doivent être faites **une seule fois**, dans la couche
> d'accès aux données, jamais dans les vues.

### 2.3 Contenu de `meta` par type

| Clé | Types concernés | Rôle |
|---|---|---|
| `titre` | `default` | Titre affiché en grand. |
| `texte` | `default` | Texte enrichi (HTML produit par l'éditeur). |
| `color` | `default` | Couleur du texte. Défaut `#FFFFFF`. |
| `emojiPrincipal` | `default` | Un emoji unique, affiché centré. Exclusif avec `imagePrincipale`. |
| `imagePrincipale` | `default` | Visuel centré. Exclusif avec `emojiPrincipal`. |
| `url` | `default` | Adresse encodée en QR code, incrusté en bas à droite. |
| `image` | `default`, `image` | Image de fond. |
| `fit` | `default`, `image` | `cover` ou `contain`. Défaut `cover`. |
| `opacity` | `default`, `image` | 0 à 1. Défaut 1. |
| `backgroundColor` | `default`, `image` | Couleur de fond. Défaut `#000000`. |
| `video` | `video` | Vidéo à diffuser. |
| `url` | `url` | Page web à afficher en plein slide. |

> ⚠️ La clé `url` a **deux significations** selon le type : QR code pour `default`,
> page à afficher pour `url`. Comportement à conserver tel quel, mais à isoler dans
> un schéma par type (`core/slide-types.js`) pour éviter les confusions.

### 2.4 Table `liens_ecrans_slides`

| Champ | Rôle |
|---|---|
| `ecran_id` | Écran concerné. |
| `slide_id` | Slide concerné. |

Relation plusieurs-à-plusieurs. **Comportement v1 à conserver** : l'enregistrement
d'un slide supprime tous ses liens puis les réinsère. La v2 doit passer à un
**calcul de différentiel** (ajouts / retraits) pour ne pas perdre les attributs de
lien introduits en annexe.

### 2.5 Stockage de fichiers

| Espace | Contenu |
|---|---|
| `medias/medias/` | Fichiers d'origine. |
| `medias/thumbnails/` | Miniatures 150 px de large, générées au dépôt. |
| `apercus/` | Captures PNG de slides, nommées `<id>.png`. |

Formats acceptés : `image/jpeg`, `image/png`, `image/gif`, `image/webp`,
`image/avif`, `image/svg+xml`, `video/mp4`. Les miniatures ne sont générées que
pour les images matricielles (pas pour SVG ni vidéo).

### 2.6 Services externes

| Service | Usage |
|---|---|
| Proxy d'images | Réécriture de l'URL de stockage vers le domaine d'images, avec paramètres de redimensionnement (`w`) et d'anti-cache (`t`). |
| Générateur de QR code | Reçoit une URL, renvoie une image. |
| Convertisseur vidéo | Reçoit une URL de vidéo et un format cible (`mp4`, `webm`), renvoie le flux converti. |
| Liaison temps réel | Canal permanent entre l'administration et les lecteurs. Voir §8. |

Toutes ces adresses doivent être **regroupées dans un fichier de configuration
unique** (`core/config.js`), alimenté par les variables d'environnement. En v1
elles sont écrites en dur dans six composants différents, dont une dans le
`index.html`.

---

## 3. Refonte n°1 — États de diffusion

C'est le cœur de la v2.

### 3.1 Le problème

En v1, six conditions indépendantes décident qu'un slide passe ou non :

1. il n'est pas dans la corbeille (`trash`) ;
2. il est rattaché à l'écran (`liens_ecrans_slides`) ;
3. il est actif (`active`) ;
4. sa date de publication est passée et son expiration n'est pas atteinte ;
5. l'instant présent tombe dans une de ses plages horaires (`display_times`) ;
6. aucun slide prioritaire n'est en cours de diffusion sur cet écran — sinon il est
   écarté, sauf s'il est lui-même prioritaire ou marqué permanent.

L'interface n'expose que la n°3, sous forme d'une case à cocher. Résultat : un
slide peut être « ON » et ne jamais s'afficher, sans aucun indice à l'écran.

### 3.2 L'état calculé

La v2 introduit une fonction unique, `computeSlideState(slide, ecran, now)`,
utilisée **partout** (listes, fiche, lecteur, frise). Elle renvoie un état parmi
huit, dans cet ordre de priorité :

| État | Pastille | Signification | Message affiché |
|---|---|---|---|
| `corbeille` | ⚫ gris foncé | Dans la corbeille. | « Dans la corbeille depuis le 3 mars. » |
| `desactive` | ⚪ gris | `active` est faux. | « Désactivé — ne passe sur aucun écran. » |
| `orphelin` | 🟠 orange | Actif, mais rattaché à aucun écran. | « Aucun écran sélectionné : ce slide ne passe nulle part. » |
| `expire` | 🔴 rouge | Date d'expiration dépassée. | « Expiré le 2 mars à 18:00. » |
| `programme` | 🔵 bleu | Date de publication dans le futur. | « Passera en diffusion le 12 mars à 08:00 (dans 4 jours). » |
| `hors_plage` | 🟡 jaune | Hors des plages horaires définies. | « Hors plage — reprendra lundi à 09:00. » |
| `ecarte` | 🟣 violet | Évincé par un slide prioritaire en cours. | « Écarté par le slide prioritaire « Fermeture exceptionnelle », jusqu'à 18:00. » |
| `diffusion` | 🟢 vert | Passe en ce moment. | « En diffusion — 42 s toutes les 3 min 10 s. » |

**Règles de calcul.**

- L'état est **relatif à un écran**. Dans la liste globale des slides (tous écrans
  confondus), on affiche l'état **le plus favorable** parmi les écrans rattachés,
  avec le détail au survol : « En diffusion sur *Accueil* · Hors plage sur
  *Cafétéria* ».
- `ecarte` ne peut se calculer qu'au niveau d'un écran, puisqu'il dépend des autres
  slides de cet écran.
- Les états `programme`, `hors_plage` et `ecarte` sont **temporaires** : le message
  doit toujours indiquer **quand** la situation change. C'est cette information qui
  manque le plus aujourd'hui.

### 3.3 Le panneau « Pourquoi ? »

Sur la fiche d'un slide, et au clic sur la pastille dans les listes, un panneau
déroule les six conditions, chacune avec son verdict :

```
Ce slide passe-t-il en ce moment ?                            🟡 Hors plage

✅  Pas dans la corbeille
✅  Activé
✅  Rattaché à 2 écrans : Accueil, Cafétéria
✅  Publié depuis le 1er mars à 09:00
✅  N'expire pas
❌  Hors plage horaire
    Règle en vigueur : lundi à vendredi, 09:00 → 18:00
    Il est samedi 14:32 → reprise lundi à 09:00
✅  Aucun slide prioritaire en cours sur ces écrans

→  Prochaine diffusion : lundi 10 mars à 09:00
```

Chaque ligne en échec propose un **raccourci de correction** : « Retirer la plage
horaire », « Rattacher à un écran », « Repousser l'expiration », « Voir le slide
prioritaire ».

### 3.4 Activation par écran

**Constat.** En v1, `active` est un booléen global. Un slide diffusé sur trois
écrans ne peut pas être coupé sur un seul. C'est le manque le plus gênant au
quotidien : on finit par dupliquer les slides.

**Proposition.** Ajouter une colonne `active` (booléen, défaut vrai) sur
`liens_ecrans_slides`. La règle d'éligibilité devient :

```
diffusé  =  slide.active  ET  lien.active  ET  (autres conditions)
```

`slide.active` conserve son rôle d'**interrupteur général** ; `lien.active` devient
un **interrupteur par écran**.

**Interface.** Dans la vue « slides d'un écran », l'interrupteur agit sur le lien
(portée : cet écran). Dans la liste globale et la fiche, l'interrupteur agit sur le
slide, avec un avertissement explicite :

> ⚠️ Ce slide est diffusé sur **3 écrans**. Le désactiver le coupe partout.
> [ Couper partout ]  [ Couper seulement sur… ]

**Repli** si la colonne n'est pas ajoutée : l'interrupteur reste global, mais
l'avertissement ci-dessus et la portée de l'action doivent être affichés — c'est
déjà une amélioration nette par rapport à la case muette actuelle.

### 3.5 Interrupteur avec intention

L'interrupteur binaire ne dit rien de la raison ni de la durée d'une coupure. La v2
propose un contrôle à deux niveaux :

- **Clic simple** sur l'interrupteur → bascule immédiate, comme aujourd'hui.
- **Menu attenant** (`▾`) → intentions courantes :
  - *Diffuser jusqu'au…* → renseigne la date d'expiration ;
  - *Diffuser à partir du…* → renseigne la date de publication ;
  - *Suspendre 1 h / jusqu'à demain / jusqu'à lundi* → coupure avec **réactivation
    automatique** ;
  - *Mettre en priorité* → ajoute l'option de priorité à ses plages horaires ;
  - *Dupliquer* / *Mettre à la corbeille*.

> La suspension temporaire s'implémente sans nouveau champ : elle pose une date de
> publication dans le futur et laisse le slide actif. L'état affiché devient alors
> `programme`, avec le message « Suspendu — reprise demain à 09:00 ».

### 3.6 Listes : filtres, compteurs, actions groupées

**En-tête de liste** — un bandeau de compteurs cliquables, qui sont aussi les
filtres :

```
🟢 12 en diffusion   🔵 3 programmés   🟡 5 hors plage   🟣 1 écarté
⚪ 8 désactivés      🟠 2 sans écran   🔴 4 expirés      ⚫ 17 corbeille
```

**Filtres complémentaires** : par écran, par type, par recherche textuelle sur le
nom, et un tri (ordre de diffusion / nom / date de modification / durée).

**Sélection multiple** : cases à cocher par ligne, plus « tout sélectionner ».
Actions en lot sur la sélection :

- Activer / Désactiver
- Rattacher à un écran / Retirer d'un écran
- Définir une expiration commune
- Mettre à la corbeille / Restaurer

Toutes les actions en lot passent par **une seule requête** et affichent un retour
compact (« 6 slides désactivés · Annuler »). L'annulation doit être possible
pendant quelques secondes.

### 3.7 La frise de la journée

Une vue par écran répondant à la question « qu'est-ce qui passe, et quand ? ».

```
Écran « Accueil » — jeudi 12 mars

00h    06h        09h              12h              18h        24h
│──────│──────────│────────────────│────────────────│──────────│
        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Bienvenue (permanent)
                  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                    Menu du midi
                                   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  Événements du soir
                       ▓▓▓▓▓▓▓▓▓▓                     ⚡ Fermeture exceptionnelle
                       └── écarte les slides non permanents ──┘
                                        ▲ maintenant (14:32)
```

Éléments attendus :

- une **barre par slide**, positionnée sur ses plages horaires ;
- un **curseur « maintenant »** ;
- les slides **prioritaires** distingués, avec la zone d'éviction qu'ils provoquent
  matérialisée sur les slides écartés ;
- un **sélecteur de jour** pour se projeter (et vérifier une parité de semaine) ;
- au clic sur une barre, ouverture du slide.

C'est la contrepartie visuelle du champ `display_times` : elle rend enfin lisible
un paramétrage aujourd'hui invisible.

### 3.8 Aperçu de l'écran en direct

Dans la liste des écrans et sur la fiche d'un écran, afficher :

- le **slide en cours** (nom + miniature) et le suivant ;
- le **nombre de slides éligibles à cet instant**, la **durée totale du cycle** ;
- l'**état de liaison** du téléviseur : connecté / hors ligne depuis X minutes.

Cela permet de constater d'un coup d'œil qu'un écran ne diffuse rien (0 slide
éligible) — situation aujourd'hui indétectable sans se déplacer.

---

## 4. Refonte n°2 — Éditeur d'horaires

### 4.1 Format de `display_times` (inchangé)

Chaîne JSON contenant un tableau de règles. Chaque règle peut porter :

| Clé | Valeurs | Rôle |
|---|---|---|
| `days` | `monday` … `sunday` | Jours concernés. Absent = tous les jours. |
| `start` | `"HH:MM"` | Heure de début. |
| `end` | `"HH:MM"` | Heure de fin. |
| `weekNumberIs` | `"even"` \| `"odd"` \| numéro | Restriction sur la parité ou le numéro de semaine. |
| `priority` | booléen | Le slide évince les slides non permanents. |
| `always` | booléen | Le slide survit à l'éviction par un slide prioritaire. |

Valeur vide, absente, ou la chaîne `"null"` → **diffusion permanente**.

> Les options `priority` et `always` existent en v1 mais **n'apparaissent nulle
> part dans l'interface**, pas même dans l'aide contextuelle. Leur exposition est
> un livrable de la v2.

### 4.2 Sémantique à corriger

L'implémentation v1 sort de la boucle d'évaluation (`break`) dès qu'une règle ne
correspond pas au jour ou au numéro de semaine, au lieu de passer à la règle
suivante (`continue`). Concrètement : **si la première règle ne s'applique pas
aujourd'hui, les règles suivantes ne sont jamais évaluées**.

Comportement attendu en v2 : les règles sont **alternatives**, le slide est
diffusable si **au moins une** est satisfaite. C'est ce que l'aide de la v1 laisse
entendre, et ce que l'utilisateur attend.

> ⚠️ **Point de vigilance à la migration.** Ce correctif peut *réactiver* des
> slides qui ne passaient plus à cause du bug. L'outil `tools/rapport-horaires.mjs`
> compare l'ancienne et la nouvelle évaluation sur huit semaines, par pas de
> quinze minutes, et liste les slides concernés.

**Ce que le rapport a effectivement trouvé** (99 slides, 5 avec des plages) :

| Slide | Avant | Après | Diagnostic |
|---|---|---|---|
| #61 « Ménage de printemps » | 731,8 h | 805,8 h | Deux règles avec des jours différents ; le `break` rendait la seconde inatteignable. **Le correctif rétablit l'intention, rien à convertir.** |
| #89 « Ménage participatif » | 25 h | 50 h | Filtre de semaine isolé — voir ci-dessous. **Converti.** |
| #103 « Tâches ménage » | 5 h | 10 h | Même cas. **Converti.** |

**Le cas du filtre de semaine isolé.** Deux slides étaient paramétrés ainsi :

```json
[
  { "weekNumberIs": "even" },
  { "start": "13:15", "end": "14:15", "days": ["tuesday"], "priority": true }
]
```

L'auteur a écrit la contrainte de semaine dans une règle séparée, en attendant
qu'elle s'applique à l'ensemble. En v1, le `break` produisait *par accident*
exactement ce comportement. En v2, une règle sans horaire ne contraint rien :
elle devient inerte, et le slide passerait **toutes les semaines au lieu d'une
sur deux** — le doublement exact visible dans le tableau.

La conversion reporte la parité dans les règles suivantes et supprime la règle
isolée :

```json
[
  { "start": "13:15", "end": "14:15", "days": ["tuesday"], "priority": true,
    "weekNumberIs": "even" }
]
```

Elle a été vérifiée équivalente au comportement v1 sur toute la fenêtre d'analyse
(25 h → 25 h, 5 h → 5 h), **appliquée**, et le rapport ne signale plus que #61 —
qui est le correctif voulu. L'intention est désormais explicite et modifiable
dans l'éditeur assisté. La conversion est sans effet sur la v1 encore en
production : la règle unique produit le même résultat avec `break` ou `continue`.

Le calcul du numéro de semaine doit également passer à la **norme ISO 8601**
(semaine commençant le lundi, semaine 1 = celle du premier jeudi), la formule v1
donnant des résultats faux en début et en fin d'année. Même vigilance à la
migration pour les slides en parité de semaine.

### 4.3 L'éditeur

**Mode assisté** (par défaut) — une carte par règle :

```
┌─ Règle 1 ──────────────────────────────────────────── [supprimer] ─┐
│  Jours     [✓]L [✓]M [✓]M [✓]J [✓]V [ ]S [ ]D    [Tous] [Semaine] │
│  De        [ 09:00 ]        à        [ 18:00 ]                     │
│  Semaines  ( • ) Toutes  ( ) Paires  ( ) Impaires  ( ) N° [    ]   │
│  [ ] Slide prioritaire — écarte les autres slides pendant sa plage │
│  [ ] Diffusion permanente — résiste aux slides prioritaires        │
└────────────────────────────────────────────────────────────────────┘
                                                    [ + Ajouter une règle ]

Résumé : du lundi au vendredi, de 09:00 à 18:00, toutes les semaines.
🟡 Nous sommes samedi : ce slide ne passe pas en ce moment.
```

- **Résumé en français** recalculé à chaque modification.
- **Verdict immédiat** : passe / ne passe pas maintenant, et prochaine occurrence.
- **Raccourcis** : *Heures d'ouverture*, *Midi*, *Week-end*, *Une semaine sur deux*.
- **Validation** : heure de fin antérieure au début, plages qui ne se chevauchent
  jamais avec les jours cochés, numéro de semaine hors bornes.

**Mode expert** — le JSON brut, avec coloration, reformatage automatique et
signalement d'erreur de syntaxe. Bascule libre entre les deux modes ; le passage en
mode assisté est refusé (avec explication) si le JSON contient des clés inconnues,
afin de ne rien écraser silencieusement.

Le même éditeur sert pour les horaires de la **barre latérale** d'un écran
(`side_times`), où les options `priority` et `always` sont masquées.

---

## 5. Architecture applicative

### 5.1 Principes

- **Pas de framework applicatif.** JS moderne (modules ES), HTML, CSS, Bulma.
- **Composants natifs** : les éléments d'interface réutilisables sont des
  *custom elements* (`<slide-row>`, `<media-picker>`, `<schedule-editor>`,
  `<state-badge>`). Pas de Shadow DOM, pour que Bulma s'applique normalement.
- **Un état central observable**, minimal (~50 lignes) : un objet de données,
  des abonnements par clé, un rendu déclenché sur changement.
- **Pas de DOM virtuel.** Chaque composant sait se re-rendre à partir de son
  modèle ; les listes utilisent une reconciliation par clé (`id`) simple.
- **La logique métier ne touche jamais au DOM**, et le DOM ne fait jamais de
  requête réseau. C'est ce qui permet au lecteur et à l'administration de partager
  exactement les mêmes règles.

### 5.2 Découpage des dossiers

```
src/
  core/                     ← aucune dépendance au DOM, testable seul
    config.js               ← toutes les URLs de services, lues de l'environnement
    api.js                  ← accès aux données : lecture, écriture, normalisation
    store.js                ← état observable
    schedule.js             ← analyse et évaluation des plages horaires
    state.js                ← computeSlideState() + messages explicatifs
    playlist.js             ← sélection et ordre des slides d'un écran
    slide-types.js          ← schéma de meta par type, valeurs par défaut
    media.js                ← URLs de médias, miniatures, formats acceptés
    realtime.js             ← liaison temps réel, reconnexion

  ui/
    router.js               ← routage par l'historique du navigateur
    components/             ← custom elements
    views/                  ← une vue par écran de l'application

  render/                   ← rendu d'un slide, PARTAGÉ admin ↔ lecteur
    slide-default.js
    slide-image.js
    slide-video.js
    slide-url.js
    slide.css

  admin.js                  ← point d'entrée administration
  player.js                 ← point d'entrée lecteur
  styles/
```

**Deux points d'entrée distincts.** Le lecteur ne charge ni Bulma, ni l'éditeur de
texte, ni les vues d'administration. Il doit rester léger et démarrer vite sur du
matériel modeste.

### 5.3 Le dossier `render/` : la règle d'or

Le rendu d'un slide est écrit **une seule fois** et sert à la fois au lecteur, à
l'aperçu de la fiche et à la génération des captures. La v1 est déjà bâtie ainsi ;
c'est à préserver strictement. Toute divergence entre l'aperçu et la diffusion
réelle est un défaut.

Les polices de caractères, les tailles relatives (exprimées en unités de fenêtre)
et la mise en page des compositions doivent être **reprises telles quelles**, pour
que les contenus existants s'affichent à l'identique.

### 5.4 Accès aux données

Un module unique expose les opérations métier, jamais les requêtes brutes :

```js
ecrans.list()            ecrans.get(id)         ecrans.save(ecran)
ecrans.remove(id)        ecrans.setOrder(id, slideIds)

slides.list({ ecranId, trash, search, state })
slides.get(id)           slides.create()        slides.save(slide)
slides.setActive(ids, actif)                    // action en lot
slides.trash(ids)        slides.restore(ids)    slides.duplicate(id)
slides.setEcrans(slideId, ecranIds)             // différentiel, pas purge/réinsert

medias.list()            medias.upload(files)   medias.remove(name)
```

Chaque lecture **normalise** : `display_times === "null"` → chaîne vide, `meta`
absent → objet vide, `duration` absente → valeur par défaut, `playlist_volume`
absent → 50.

### 5.5 Accès à l'application

Code d'accès unique partagé, mémorisé localement, comme en v1. Les routes du
lecteur ne sont jamais protégées : un téléviseur doit pouvoir redémarrer seul.

> Le code n'est pas un mécanisme de sécurité (il est vérifiable côté navigateur) :
> c'est un garde-fou contre les modifications accidentelles. La protection réelle
> des données repose sur les règles d'accès du service de données, qui ne sont pas
> modifiées par la v2.

---

## 6. Cartographie des vues

| Route | Vue | Contenu |
|---|---|---|
| `/` | **Écrans** | Liste des écrans : vignette, nom, nombre de slides, **slide en cours**, **état de liaison**, nombre de slides éligibles. Actions : visionner, slides, éditer, recharger, avancer. Création d'un écran. |
| `/ecran/:id` | **Fiche écran** | Nom, adresse courte, illustration, barre latérale (activation, adresse, horaires via l'éditeur assisté), playlist (activation, morceaux, volume), suppression. |
| `/ecran/:id/slides` | **Slides d'un écran** | Liste ordonnée, réorganisable par glisser-déposer. Interrupteurs **par écran**. Compteurs d'états, filtres, sélection multiple. Accès à la frise. |
| `/ecran/:id/frise` | **Frise de la journée** | Vue §3.7. |
| `/slides` | **Tous les slides** | Même liste, tous écrans confondus, avec la colonne des écrans de diffusion. |
| `/slides/corbeille` | **Corbeille** | Slides archivés, restauration, suppression définitive. |
| `/slide/:id` | **Fiche slide** | Paramètres communs, panneau « Pourquoi ? », formulaire du type, éditeur d'horaires, aperçu en direct, écrans de diffusion, dates de création et de modification. |
| `/medias` | **Médias** | Dépôt multiple, recherche, liste illustrée, consultation, suppression. |
| `/visionner/:slug` | **Lecteur** | Diffusion d'un écran. |
| `/visionner/slide/:id` | **Lecteur — slide seul** | Un slide en plein écran, sans défilement. |

### Fiche slide — organisation

Trois colonnes sur grand écran, empilées sur petit :

1. **Identité et diffusion** — nom, type, durée, dates de publication et
   d'expiration, écrans de diffusion, interrupteur avec intentions.
2. **Contenu** — le formulaire propre au type (composition, image, vidéo, page web).
3. **Contrôle** — aperçu en direct, pastille d'état, panneau « Pourquoi ? »,
   éditeur d'horaires.

La barre de validation reste ancrée en bas. Un **avertissement avant de quitter**
doit apparaître en cas de modifications non enregistrées — absent en v1, et cause
de pertes de saisie.

### Formulaires par type

| Type | Champs |
|---|---|
| **Composition** | Emoji principal *ou* image principale (mutuellement exclusifs, l'un grise l'autre) · Titre · Texte enrichi (gras, italique, souligné, barré, 2 niveaux de titre, 4 tailles, couleurs de texte et de fond, police, alignement, effacer la mise en forme) · Couleur du texte · URL en QR code · Image de fond et ses réglages. |
| **Image** | Image de fond · Ajustement `cover`/`contain` · Opacité · Couleur de fond. |
| **Vidéo** | Vidéo · Aperçu lisible. **Ajout v2** : proposition automatique de la durée du slide à partir de la durée réelle de la vidéo. |
| **Page web** | Adresse de la page. |

---

## 7. Le lecteur (mode diffusion)

### 7.1 Exigences

Le lecteur tourne des semaines sans intervention sur du matériel modeste. Priorités,
dans l'ordre : **ne jamais s'arrêter**, **rester à jour**, **démarrer vite**.

### 7.2 Cycle de diffusion

1. Charger l'écran par son adresse courte, ses slides et ses liens.
2. Calculer la liste éligible via `core/playlist.js`, qui applique exactement les
   règles du §3.1 — **le même code que l'administration**.
3. Trier selon `slideSort`, les slides non listés étant placés à la suite.
4. Afficher chaque slide pendant sa durée, avec transition et **barre de
   progression** du temps restant.
5. En fin de liste, **recalculer** la liste éligible, puis reprendre au début.

**Recalcul périodique.** La liste doit être réévaluée au moins **une fois par
minute** en plus de la fin de cycle : une plage horaire peut s'ouvrir ou se fermer
au milieu d'un long cycle, et un slide prioritaire doit prendre effet sans attendre.

**Liste vide.** Si aucun slide n'est éligible, afficher un écran d'attente sobre
(logo, heure) et **signaler l'anomalie** dans l'état de liaison, pour qu'elle soit
visible côté administration. La v1 laisse un écran noir sans explication.

### 7.3 Éléments annexes

- **Barre latérale** : page web sur le côté, si activée et dans sa plage horaire.
  Le diaporama occupe l'espace restant, et le plein écran dès que la barre se
  masque. La transition entre les deux dispositions doit être propre.
- **Playlist audio** : liste mélangée aléatoirement, jouée en boucle, au volume
  configuré. Totalement indépendante du défilement.
  *Point de vigilance* : le mélange doit utiliser un algorithme correct
  (Fisher-Yates), la v1 utilisant un tri à comparateur aléatoire qui produit une
  distribution biaisée.
- **Raccourcis clavier** : flèche droite = slide suivant, flèche gauche = précédent.
  Le passage manuel annule le minuteur en cours.
- **Vidéos** : lecture automatique sans son, remise à zéro à l'apparition, pause à
  la disparition, sources en plusieurs formats.

### 7.4 Robustesse

- **Reconnexion** de la liaison temps réel avec attente progressive, sans boucle de
  rechargement.
- **Reprise après incident** : si le cycle s'interrompt (erreur de rendu d'un
  slide), le slide fautif est écarté du cycle courant et le diaporama continue.
  Aujourd'hui, une erreur peut figer l'écran jusqu'au prochain rechargement manuel.
- **Signal de vie** : le lecteur signale périodiquement son activité, ce qui
  alimente l'indicateur de liaison de la liste des écrans (§3.8).
- **Rechargement quotidien** automatique aux heures creuses, pour récupérer les
  mises à jour de l'application elle-même.

---

## 8. Pilotage à distance

Liaison permanente entre l'administration et les lecteurs, par canal temps réel.
Chaque lecteur s'annonce à la connexion avec l'adresse courte de son écran.

| Commande | Effet |
|---|---|
| `refresh-ecran` | Le lecteur ciblé recharge sa page. |
| `avancer-ecran` | Le lecteur ciblé passe au slide suivant. |

**Ajouts v2 :**

| Commande | Effet |
|---|---|
| `reculer-ecran` | Slide précédent. |
| `afficher-slide` | Affiche immédiatement un slide donné, hors cycle, pour vérification. |
| `ping` / `pong` | Alimente l'indicateur de liaison et le nombre de slides éligibles. |

Le protocole reste le même : messages structurés portant un nom de commande et
l'identifiant de l'écran ciblé.

**À corriger :** en v1, une commande de rechargement reçue deux fois de suite
déclenche un rechargement immédiat au lieu du rechargement différé prévu, et la
fermeture du canal provoque un rechargement complet de la page toutes les trois
secondes tant que le service est indisponible. La v2 doit distinguer *perte de
liaison* (on retente la connexion) de *besoin de rechargement* (on recharge la page).

---

## 9. Build et versionnement des assets

### 9.1 Objectif

Produire des URLs d'assets porteuses d'un hash du contenu, de la forme
`app.js?v=8f3a1c` — les téléviseurs et les navigateurs ne doivent jamais servir
une version périmée, et un déploiement doit prendre effet sans vider de cache.

Le suffixe en **paramètre de requête** est préféré au nom de fichier haché, pour
garder des chemins stables et lisibles côté serveur et proxy.

### 9.2 Chaîne recommandée

**esbuild** pour le regroupement JS et CSS, plus un court script de post-traitement.
Rapide, sans configuration lourde, et sans dépendance à un framework.

```
npm run dev     → serveur local avec rechargement
npm run build   → production dans dist/
npm run preview → prévisualisation du build
```

Étapes du build :

1. Regrouper et minifier les deux points d'entrée (`admin.js`, `player.js`) et les
   feuilles de style, vers `dist/assets/`, **sans hash dans les noms de fichiers**.
2. Calculer un hash court (8 caractères) du contenu de chaque fichier produit.
3. Écrire un manifeste `dist/assets/manifest.json` associant chemin et hash.
4. Réécrire les pages HTML en remplaçant les marqueurs par les URLs versionnées.
5. Injecter le manifeste dans l'application, pour que les assets chargés
   dynamiquement (polices, rendus, images de l'interface) puissent être versionnés
   de la même façon.

```html
<!-- source -->
<script type="module" src="/assets/admin.js{{v}}"></script>
<link rel="stylesheet" href="/assets/admin.css{{v}}">

<!-- après build -->
<script type="module" src="/assets/admin.js?v=8f3a1c2e"></script>
<link rel="stylesheet" href="/assets/admin.css?v=41b7de90">
```

### 9.3 Règles de cache

| Ressource | Politique |
|---|---|
| Pages HTML | Jamais mises en cache (elles portent les numéros de version). |
| Assets versionnés | Cache long, immuable. |
| Médias | Cache long, l'anti-cache se faisant par paramètre lors des mises à jour. |
| Manifeste | Jamais mis en cache. |

### 9.4 Configuration

Les adresses de services et le code d'accès proviennent de variables
d'environnement, injectées au build dans `core/config.js`. **Aucune URL de service
en dur dans le code**, et notamment plus rien dans `index.html`.

---

## 10. Découpage du chantier

Travail sur une branche dédiée (`v2`), la v1 restant en production jusqu'à la
bascule.

| Lot | Contenu | Livrable vérifiable |
|---|---|---|
| **0. Socle** | Arborescence, build esbuild + hashs, configuration, routage, mise en page Bulma. | Une page vide se construit et se sert avec des assets versionnés. |
| **1. Métier** | `core/` complet : accès aux données, plages horaires (corrigées), états, playlist, types de slides. Tests unitaires sur les plages horaires et les états — c'est là que sont les pièges. | Les règles d'éligibilité s'exécutent hors navigateur, avec un jeu d'essai. |
| **2. Rendu** | `render/` : les quatre types, à l'identique de la v1. | Comparaison visuelle sur un échantillon de slides réels : aucun écart. |
| **3. Lecteur** | Cycle, transitions, barre de progression, barre latérale, playlist, clavier, robustesse, temps réel. | Un téléviseur tourne 48 h sans intervention. |
| **4. Listes et états** | Listes de slides, pastilles, compteurs, filtres, sélection multiple, actions en lot, panneau « Pourquoi ? ». | La refonte du §3 est utilisable. |
| **5. Édition** | Fiche slide, formulaires par type, éditeur d'horaires assisté, sélecteur de médias, aperçu. | Un slide se crée et se modifie de bout en bout. |
| **6. Écrans et médias** | Liste et fiche des écrans, frise, bibliothèque de médias, pilotage à distance. | Parité fonctionnelle complète avec la v1. |
| **7. Bascule** | Rapport de comparaison des évaluations d'horaires (§4.2), reprise des données, bascule progressive écran par écran. | Tous les écrans sont passés en v2. |

**Ordre imposé.** Les lots 1 et 2 conditionnent tout le reste : la couche métier et
le rendu doivent être justes et partagés avant que quoi que ce soit d'autre soit
construit dessus. C'est précisément la duplication de ces deux couches qui rend la
v1 difficile à faire évoluer.

---

## 11. Annexe — Évolutions de données proposées

Aucune n'est bloquante ; chacune a un repli.

| # | Évolution | Bénéfice | Repli si non appliquée |
|---|---|---|---|
| 1 | `liens_ecrans_slides.active` (booléen, défaut vrai) | **Activation par écran** — le manque le plus gênant. | Interrupteur global, avec avertissement explicite de portée. |
| 2 | `liens_ecrans_slides.position` (entier) | Ordre porté par le lien plutôt que par un tableau dans `ecrans.slideSort` : plus fiable à plusieurs, et pas de désynchronisation lors des suppressions. | Conserver `slideSort`, en nettoyant les identifiants obsolètes à la lecture. |
| 3 | `slides.display_times` en JSON natif plutôt qu'en texte | Supprime le cas de la chaîne `"null"` et les erreurs d'analyse. | Normalisation systématique à la lecture. |
| 4 | `ecrans.last_seen_at` (horodatage) | Indicateur de liaison fiable, même après rechargement de l'administration. | Déduire l'état de liaison des seuls messages temps réel de la session en cours. |
| 5 | `slides.duration` : valeur par défaut en base | Évite les slides à durée nulle qui défilent instantanément. | Valeur par défaut appliquée côté application. |

---

## Résumé des apports de la v2

**Ce qui change pour l'utilisateur**

- Il voit **si un slide passe** en ce moment, et **pourquoi** quand ce n'est pas le
  cas — avec la date de la prochaine diffusion.
- Il peut **couper un slide sur un seul écran** sans le dupliquer.
- Il paramètre les **horaires dans un formulaire**, pas en JSON, et il découvre
  enfin les options de **priorité** et de **diffusion permanente**.
- Il consulte une **frise de la journée** par écran, qui rend visible tout le
  paramétrage horaire.
- Il traite **plusieurs slides à la fois**, et filtre la liste par état.
- Il détecte depuis l'administration qu'un **écran ne diffuse rien** ou qu'il est
  **hors ligne**.

**Ce qui change sous le capot**

- Une **couche métier unique** partagée par l'administration et le lecteur.
- Deux **points d'entrée séparés** : un lecteur léger, une administration complète.
- Les **règles d'évaluation des plages horaires corrigées** (règles alternatives,
  numéro de semaine ISO).
- Un **lecteur qui ne se bloque plus** sur un slide en erreur, se reconnecte
  proprement et signale son activité.
- Toutes les **adresses de services centralisées** dans une configuration unique.
- Un **build produisant des assets versionnés** par hash de contenu.

**Ce qui ne change pas**

Le contrat de données, le protocole de pilotage à distance, le rendu visuel des
slides, les services externes, et le mode d'accès par code partagé.
