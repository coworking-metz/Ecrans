# Écrans — Documentation fonctionnelle

## 1. Présentation générale

**Écrans** est une application d'affichage dynamique (*digital signage*) destinée à un
espace de coworking. Elle permet de composer des contenus (les **slides**), de les
regrouper en diaporamas, et de les diffuser en boucle sur un ou plusieurs
téléviseurs / moniteurs installés dans les locaux (les **écrans**).

L'application se compose de deux faces complémentaires :

- **L'interface d'administration**, utilisée par les gestionnaires du lieu pour créer,
  organiser et planifier les contenus.
- **Le mode diffusion (« visionner »)**, ouvert en plein écran sur chaque téléviseur,
  qui fait défiler les slides en continu sans intervention humaine.

### Vocabulaire

| Terme | Définition |
|---|---|
| **Écran** | Un point de diffusion physique (un téléviseur du lieu). Il possède un nom, une adresse propre, une configuration et une liste ordonnée de slides. |
| **Slide** | Une unité de contenu affichée pendant une durée donnée : une composition texte/image, une image seule, une vidéo ou une page web. |
| **Média** | Un fichier (image ou vidéo) déposé dans la bibliothèque partagée et réutilisable dans n'importe quel slide. |
| **Diaporama** | La suite des slides actifs et éligibles d'un écran, jouée en boucle. |

Un même slide peut être diffusé sur plusieurs écrans à la fois ; un écran peut
diffuser autant de slides que nécessaire. La relation est libre dans les deux sens.

---

## 2. Accès à l'application

### Protection par code
L'accès à l'administration est protégé par un **code d'accès unique et partagé**
(le code de la boîte à clés de la réserve). À la première ouverture, un écran de
saisie s'affiche ; une fois le bon code saisi, il est mémorisé sur l'appareil et
n'est plus redemandé.

Il n'y a pas de comptes utilisateurs individuels : toute personne connaissant le
code dispose des mêmes droits.

### Exception : les pages de diffusion
Les pages de diffusion (celles affichées sur les téléviseurs) ne sont **jamais**
protégées par le code. Un téléviseur peut donc être allumé et lancé sans
intervention, y compris après une coupure de courant.

### Navigation
Un menu permanent donne accès aux trois grandes sections :
**Écrans**, **Slides**, **Médias**.

---

## 3. Gestion des écrans

### 3.1 Liste des écrans
La page d'accueil liste tous les écrans configurés. Pour chacun sont affichés :

- une **vignette** (l'image d'illustration associée, ou une image générique par défaut) ;
- le **nom** de l'écran ;
- le **nombre de slides** qui lui sont rattachés.

Quatre actions rapides sont disponibles sur chaque ligne :

| Action | Effet |
|---|---|
| **Visionner** | Ouvre dans un nouvel onglet la diffusion réelle de cet écran (utile pour vérifier depuis un poste de travail ce qui passe en salle). |
| **Slides de l'écran** | Ouvre la liste des slides diffusés sur cet écran, dans leur ordre de passage. |
| **Éditer** | Ouvre la fiche de configuration de l'écran. |
| **Rafraîchir** | Force à distance le rechargement du téléviseur concerné (voir §7). |

Un bouton **Ajouter un écran** crée immédiatement un nouvel écran nommé
« Nouvel écran » et ouvre sa fiche pour le configurer.

### 3.2 Fiche d'un écran

**Identification**
- **Nom** : libellé libre servant à retrouver l'écran dans l'administration.
- **Adresse courte (*slug*)** : identifiant utilisé dans l'adresse de diffusion. C'est
  ce que l'on paramètre sur le téléviseur pour qu'il sache quel diaporama jouer.
- **Image associée** : visuel d'illustration choisi dans la bibliothèque de médias,
  affiché en vignette dans la liste des écrans (aide à reconnaître physiquement
  l'écran : accueil, salle de réunion, cafétéria…).

**Barre latérale**
Un écran peut afficher, à côté du diaporama, une **bande latérale permanente**
contenant une page web externe (planning du jour, météo, agenda des événements,
tableau d'occupation des salles…).

- Activation par une case à cocher.
- **Adresse de la page** à afficher dans la bande.
- **Horaires d'affichage de la barre** : la bande peut n'apparaître que sur certaines
  plages horaires et certains jours (par exemple uniquement aux heures d'ouverture).
  La syntaxe des plages est décrite au §5.4.

Lorsque la barre est masquée (hors plage horaire), le diaporama occupe
automatiquement toute la surface de l'écran.

**Ambiance sonore**
Un écran peut diffuser une **playlist audio** indépendante des slides :

- Activation par une case à cocher.
- **Liste des morceaux** : une adresse de fichier audio par ligne.
- **Volume** : réglage de 0 à 100 %.

À l'ouverture de la diffusion, la playlist est **mélangée aléatoirement**, puis jouée
en continu ; lorsqu'elle est terminée, elle repart au début. La lecture audio est
totalement découplée du défilement des slides.

**Suppression**
Un écran peut être supprimé après confirmation. **Les slides qui lui étaient
rattachés ne sont pas supprimés** : ils restent disponibles et diffusables sur les
autres écrans.

---

## 4. Gestion des médias

La bibliothèque de médias est un espace de stockage **commun à tous les écrans et
tous les slides**.

### 4.1 Dépôt de fichiers
- Dépôt possible de **plusieurs fichiers en une seule fois**.
- Formats acceptés : **JPEG, PNG, GIF, WebP, AVIF, SVG** pour les images et **MP4**
  pour les vidéos. Tout autre format est refusé avec un message explicite.
- Une **miniature** est générée automatiquement pour chaque image déposée, afin
  d'accélérer l'affichage des listes dans l'administration.

### 4.2 Consultation et recherche
- Les médias sont présentés sous forme de liste illustrée : miniature, nom du
  fichier (raccourci s'il est long, le nom complet restant visible au survol) et
  date de dernière modification.
- Un **champ de recherche** filtre la liste au fil de la frappe.
- Chaque média peut être **ouvert en taille réelle** dans un nouvel onglet.

### 4.3 Suppression
Un média peut être supprimé après confirmation ; sa miniature est supprimée en
même temps.

### 4.4 Sélecteur de média
Partout où un visuel est attendu (image de fond d'un slide, image principale,
vidéo, illustration d'un écran), un **sélecteur** replié propose :

- de **déposer un nouveau fichier** sans quitter le formulaire en cours (le fichier
  déposé est alors sélectionné automatiquement) ;
- de **rechercher et choisir** un média existant dans la bibliothèque ;
- un aperçu du média retenu, et la possibilité de **retirer** la sélection.

---

## 5. Gestion des slides

### 5.1 Liste des slides
Deux vues de la même liste sont accessibles :

- **Tous les slides** : l'intégralité des contenus, quel que soit l'écran.
- **Slides d'un écran** : uniquement ceux rattachés à un écran donné, présentés
  **dans leur ordre de diffusion**.

Chaque ligne affiche :

- le **nom** du slide (lien vers son édition) ;
- son **type** (composition, image, vidéo, page web) ;
- sa **durée** d'affichage en secondes ;
- un **indicateur ⏱️** si des horaires d'affichage restreints sont définis ;
- les **écrans** sur lesquels il est diffusé, sous forme d'étiquettes cliquables ;
- un **interrupteur ON / OFF** permettant d'activer ou de désactiver le slide
  instantanément, sans ouvrir sa fiche.

Actions par ligne : **éditer**, **prévisualiser** dans un nouvel onglet,
**mettre à la corbeille**.

### 5.2 Ordre de passage
Dans la vue « slides d'un écran », les slides se **réorganisent par glisser-déposer**.
L'ordre est propre à chaque écran : un même slide peut être en première position
sur un écran et en dernière sur un autre. L'ordre est enregistré immédiatement.

Les slides ajoutés à un écran sans position définie sont placés à la suite des
slides déjà ordonnés.

### 5.3 Création et corbeille
- **Créer un nouveau slide** génère un slide vide, numéroté automatiquement
  (« Nouveau slide vide (3) »), et ouvre directement sa fiche.
- La **mise à la corbeille** retire le slide de la diffusion et des listes, sans
  l'effacer. La **corbeille** est consultable à part et permet de **restaurer** un
  slide à tout moment.

### 5.4 Fiche d'un slide

**Paramètres communs à tous les types**

| Paramètre | Rôle |
|---|---|
| **Nom** | Libellé de travail, pour retrouver le slide. |
| **Slide actif** | Interrupteur principal : un slide inactif n'est jamais diffusé. |
| **Type** | Composition (« Défaut »), Image, Vidéo ou Page web. |
| **Durée** | Temps d'affichage en secondes avant passage au slide suivant. |
| **Date de publication** | Le slide n'apparaît pas avant cette date et heure. |
| **Date d'expiration** | Le slide disparaît automatiquement après cette date et heure. |
| **Écrans de diffusion** | Sélection multiple des écrans où le slide doit passer. |

Les dates de publication et d'expiration permettent de préparer une annonce à
l'avance et de garantir qu'elle disparaîtra d'elle-même une fois l'événement passé,
sans intervention.

Un **aperçu en direct** du slide, présenté dans une illustration de téléviseur
rétro, est affiché en permanence à côté du formulaire ; il se rafraîchit à chaque
enregistrement et peut être ouvert en grand dans un nouvel onglet.

La fiche indique enfin la **date de création** et la **date de dernière modification**
du slide.

**Horaires d'affichage**

Chaque slide peut être restreint à certaines plages. Le paramétrage se fait sous
forme d'une liste de règles, chacune pouvant combiner :

- **Jours de la semaine** concernés (facultatif ; par défaut tous les jours) ;
- **Heure de début** et **heure de fin** (format 24 h) ;
- **Parité ou numéro de semaine** : semaines paires, semaines impaires, ou un
  numéro de semaine précis — utile pour des animations bimensuelles ;
- **Priorité** : voir ci-dessous ;
- **Diffusion permanente** : voir ci-dessous.

Si aucune règle n'est saisie, le slide est diffusable en permanence. Une aide
contextuelle dépliable, avec des exemples, est disponible directement dans le
formulaire.

**Mécanisme de priorité**

Un slide peut être marqué comme **prioritaire**. Dès qu'au moins un slide
prioritaire est éligible à un instant donné, la diffusion **ne conserve que** :

- les slides prioritaires,
- et les slides marqués comme **permanents**.

Tous les autres sont temporairement écartés du diaporama. Ce mécanisme sert aux
communications urgentes ou aux moments forts (fermeture exceptionnelle, événement
en cours), en garantissant qu'ils ne sont pas noyés dans la rotation habituelle.

### 5.5 Les quatre types de slides

#### Composition (« Défaut »)
Le type le plus riche, destiné aux annonces et messages du lieu.

- **Élément visuel central**, au choix (l'un exclut l'autre) :
  - un **emoji unique**, affiché en grand et centré ; la saisie est nettoyée
    automatiquement pour ne conserver qu'un seul emoji valide ;
  - ou une **image principale**, choisie dans la bibliothèque.
- **Titre** en grands caractères.
- **Texte enrichi**, saisi dans un éditeur visuel : gras, italique, souligné, barré,
  deux niveaux de titres, quatre tailles de texte, couleur du texte et de fond,
  choix de police, alignement, et effacement de la mise en forme.
- **Couleur du texte** globale.
- **Image de fond**, avec réglages d'ajustement et d'opacité (voir type Image).
- **Adresse à afficher en QR code** : un QR code est généré automatiquement et
  incrusté dans un coin du slide, permettant aux visiteurs de prolonger l'annonce
  sur leur téléphone (inscription, billetterie, page d'information…).

La mise en page (centrage, tailles relatives, typographies) est gérée
automatiquement pour rester lisible sur un grand écran.

#### Image
Affichage d'une image plein écran issue de la bibliothèque, avec :

- **Ajustement** : `cover` (l'image remplit tout l'écran, quitte à être recadrée) ou
  `contain` (l'image est entièrement visible, avec des marges) ;
- **Opacité** réglable de 0 à 100 % ;
- **Couleur de fond**, utile lorsque l'image ne couvre pas toute la surface ou
  qu'elle est partiellement transparente.

#### Vidéo
Diffusion d'une vidéo de la bibliothèque, en plein écran.

- La vidéo est lue **automatiquement et sans son** dès l'apparition du slide, et
  mise en pause dès qu'il disparaît.
- Elle est **convertie automatiquement** dans plusieurs formats pour garantir la
  compatibilité avec les différents téléviseurs.
- Un **aperçu lisible** est proposé dans le formulaire d'édition.

> À noter : la durée d'affichage du slide reste celle paramétrée dans la fiche.
> Elle doit donc être ajustée à la longueur de la vidéo.

#### Page web
Affichage intégral d'une **page web externe** dans le slide (tableau de bord,
planning, page d'actualités, service tiers…). Seule l'adresse de la page est à
renseigner ; la page occupe toute la surface du slide pendant la durée définie.

---

## 6. Diffusion sur les écrans

### 6.1 Fonctionnement du diaporama
Chaque téléviseur ouvre une adresse dédiée, construite à partir de l'adresse courte
de l'écran. Le diaporama démarre alors seul et tourne en boucle.

À chaque instant, la liste des slides réellement diffusés est calculée en
appliquant, dans l'ordre, les filtres suivants :

1. le slide est **rattaché à cet écran** ;
2. le slide est **actif** ;
3. la **date de publication** est passée et la **date d'expiration** n'est pas atteinte ;
4. l'heure et le jour courants correspondent à ses **horaires d'affichage** ;
5. si un slide **prioritaire** est éligible, seuls les slides prioritaires et
   permanents sont conservés.

Les slides retenus sont joués **dans l'ordre défini pour cet écran**, chacun pendant
sa durée propre, avec une **transition** entre deux slides. Arrivé au dernier, le
diaporama repart au premier.

Une **barre de progression** discrète, en bas de l'écran, indique visuellement le
temps restant avant le passage au slide suivant.

### 6.2 Affichage combiné
Si la barre latérale est activée et dans sa plage horaire, la page web configurée
occupe une bande sur le côté, le diaporama occupant l'espace restant. Sinon, le
diaporama est en plein écran.

### 6.3 Pilotage local
Sur un écran connecté à un clavier, deux raccourcis sont disponibles :

- **Flèche droite** : passer au slide suivant ;
- **Flèche gauche** : revenir au slide précédent.

Le passage manuel interrompt le minuteur en cours.

### 6.4 Prévisualisation d'un slide seul
Une adresse dédiée permet d'afficher **un seul slide**, en plein écran et sans
défilement. Elle est utilisée pour les aperçus dans l'administration et pour
vérifier un contenu avant sa mise en diffusion.

---

## 7. Pilotage à distance des écrans

L'application maintient une **liaison permanente** avec les téléviseurs en
diffusion, ce qui permet d'agir dessus depuis l'administration sans se déplacer
physiquement dans les locaux.

Deux commandes sont disponibles :

| Commande | Effet sur le téléviseur ciblé |
|---|---|
| **Recharger** | Le téléviseur recharge sa page et reprend le diaporama avec la configuration et les contenus à jour. Utile après une modification importante. |
| **Avancer** | Le téléviseur passe immédiatement au slide suivant. Utile pour vérifier un contenu précis à distance. |

Ces commandes sont accessibles depuis la liste des écrans et depuis la vue des
slides d'un écran.

De plus, si un téléviseur **perd la liaison** (coupure réseau, redémarrage du
service), il tente de se rétablir seul en rechargeant sa page. Le mode diffusion
est ainsi conçu pour fonctionner sans surveillance.

---

## 8. Cycle de vie type d'un contenu

1. **Préparer les visuels** : déposer les images ou vidéos dans la bibliothèque de
   médias.
2. **Créer le slide** : choisir son type, composer le contenu, régler la durée.
3. **Cibler** : cocher le ou les écrans où il doit passer.
4. **Planifier** (facultatif) : définir une date de publication, une date
   d'expiration, des plages horaires, une priorité.
5. **Vérifier** : contrôler le rendu dans l'aperçu intégré, puis en grand.
6. **Activer** le slide.
7. **Positionner** : le placer au bon endroit dans l'ordre de passage de l'écran.
8. **Diffuser** : le contenu apparaît sur le téléviseur au prochain cycle, ou
   immédiatement en déclenchant un **rechargement à distance**.
9. **Retirer** : le slide disparaît seul à sa date d'expiration, ou manuellement en
   le désactivant ou en le mettant à la corbeille (restaurable).

---

## 9. Résumé des fonctionnalités

**Écrans**
- Création, édition et suppression d'écrans
- Illustration et adresse courte de diffusion
- Barre latérale web avec plages horaires propres
- Playlist audio aléatoire avec réglage de volume
- Rechargement et avance forcée à distance
- Accès direct à la diffusion réelle

**Slides**
- Quatre types : composition, image, vidéo, page web
- Éditeur de texte enrichi, emoji ou image principale, QR code intégré
- Réglages d'image : ajustement, opacité, couleur de fond
- Durée d'affichage individuelle
- Activation / désactivation immédiate
- Dates de publication et d'expiration
- Plages horaires par jour, heure et parité de semaine
- Mécanisme de priorité et de diffusion permanente
- Diffusion multi-écrans
- Ordre de passage par glisser-déposer, propre à chaque écran
- Aperçu en direct dans l'administration
- Corbeille avec restauration

**Médias**
- Dépôt multiple d'images et de vidéos
- Contrôle des formats acceptés
- Miniatures automatiques
- Recherche, consultation et suppression
- Sélecteur réutilisable dans tous les formulaires

**Diffusion**
- Boucle automatique avec transitions
- Barre de progression du temps restant
- Filtrage automatique par activation, dates, horaires et priorité
- Pilotage clavier sur place
- Reconnexion automatique après incident
- Aperçu d'un slide isolé

**Accès**
- Code d'accès unique et partagé, mémorisé sur l'appareil
- Pages de diffusion librement accessibles pour un démarrage sans intervention
