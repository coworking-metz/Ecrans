# Écrans — affichage dynamique

Application de *digital signage* de l'espace de coworking : composition de
contenus (**slides**), regroupement en diaporamas, diffusion en boucle sur les
téléviseurs du lieu (**écrans**).

- **[ECRANS.md](ECRANS.md)** — documentation fonctionnelle (ce que fait l'application).
- **[ECRANS-V2.md](ECRANS-V2.md)** — spécification de la refonte.

> **Branche `vue3`.** Portage de l'interface sur Vue 3 / Vite / Pinia /
> vue-router. La branche `v2` est la production ; celle-ci ne l'est pas encore.

## Démarrer

```bash
npm install
cp .env.modele .env      # puis compléter la clé d'accès aux données
npm run dev              # http://localhost:5174
npm run build            # produit ./dist
npm run preview          # sert ./dist localement
npm test                 # tests de la couche métier
```

| Adresse | Contenu |
|---|---|
| `/` | Administration |
| `/visionner/<slug>` | Lecteur d'un écran (page affichée sur les téléviseurs) |
| `/visionner/slide/<id>` | Un slide isolé, plein écran |

## Pile

| | Version |
|---|---|
| Vue | 3.5 |
| Vite | 8.2 |
| Pinia | 4.0 |
| vue-router | 5.3 |
| Bulma | 0.9 |
| Quill | 1.3 |

Quill est conservé pour une raison précise : les contenus déjà écrits portent
ses classes (`ql-size-large`, `ql-font-serif`, `ql-align-center`…), que la
feuille de rendu sait interpréter. En changer ferait perdre leur mise en forme.

## Organisation

```
index.html              administration
visionner.html          lecteur
vite.config.js
src/
  core/                 métier pur — ne dépend NI de Vue, NI de Pinia, NI du DOM
    config.js           toutes les adresses de services, et nulle part ailleurs
    api.js              accès aux données : opérations métier, jamais de requête brute
    schedule.js         plages horaires (analyse, évaluation, description)
    state.js            état de diffusion d'un slide + explication
    playlist.js         constitution du diaporama d'un écran
    slide-types.js      schéma des types de slides, normalisation
    realtime.js         liaison temps réel avec les lecteurs
    dates.js  media.js  formatage, URLs de médias
  stores/               Pinia : donnees (écrans, slides, liens), medias
  composables/          messages éphémères, liaison temps réel
  components/
    slides/             SlideRender + un composant par type — rendu PARTAGÉ
    etat/               pastille, bandeau, panneau « Pourquoi ? », compteurs
    horaires/           éditeur assisté + mode expert
    medias/             dépôt, liste, sélecteur
    ui/                 navigation, modale, messages
  views/                une vue par écran de l'application
  router/               vue-router, vues chargées à la demande
  admin/  player/       les deux points d'entrée
  styles/
test/                   tests de la couche métier (node:test, sans navigateur)
tools/rapport-horaires.mjs   outil de bascule des plages horaires
public/                 polices, logo, favicons, _redirects, _headers
```

Trois principes structurants :

- **`core/` ne dépend d'aucun framework.** C'est ce qui a permis de passer de
  Vue à du JavaScript nu, puis de revenir à Vue, sans réécrire une seule règle
  de diffusion — et c'est ce qui permet de la tester sans navigateur.
- **`SlideRender` est la seule définition du rendu d'un slide**, utilisée par le
  lecteur comme par l'aperçu de l'administration. Toute divergence entre les
  deux est un défaut.
- **Le lecteur et l'administration sont deux points d'entrée séparés.** Le
  lecteur ne charge ni Bulma, ni Quill, ni le routeur, ni les vues
  d'administration.

Le test `test/state.test.mjs` vérifie explicitement que `computeSlideState`
(ce que l'administration affiche) et `eligibleSlides` (ce que le lecteur
diffuse) ne peuvent pas diverger.

## Build et cache

`npm run build` produit `./dist`, le dossier publié.

Les noms de fichiers restent **stables** ; la version passe en paramètre de
requête, `admin.js?v=8f3a1c2e`, où le suffixe est un hash du contenu — c'est le
rôle du greffon `versionnerAssets` dans `vite.config.js`, Vite mettant par
défaut le hash dans le nom du fichier. Les pages HTML ne sont jamais mises en
cache, les assets versionnés le sont pour un an.

Poids chargé par le lecteur : environ 50 ko compressés (Vue et le métier),
sans Bulma ni Quill.

## Déploiement

Le projet est hébergé sur **Cloudflare Pages**, relié à ce dépôt GitHub
(`coworking-metz/Ecrans`). La production répond sur `ecrans.pages.dev`.

### Ce qui vit dans le tableau de bord Cloudflare

Pages ne lit aucune configuration versionnée pour ces réglages :

| Réglage | Valeur |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Variables d'environnement | `VITE_APP_SUPABASE_KEY`, `VITE_APP_PASSWORD`, et toute variable `VITE_APP_*` |

Vite n'expose au navigateur que les variables préfixées `VITE_`.

### Ce qui vit dans le dépôt

`public/_redirects` et `public/_headers`, copiés tels quels dans `dist/` :

- `/visionner/*` sert la page du lecteur, tout le reste sert l'administration ;
- les pages HTML et le manifeste ne sont jamais mis en cache, les assets le sont
  pour un an.

### Prévisualisation d'une branche

Cloudflare Pages déploie automatiquement les branches non-production sur une URL
de prévisualisation : cette branche est donc consultable sans toucher à la
production.

## Bascule des plages horaires

L'application corrige deux défauts d'évaluation des plages horaires hérités de
la v1 (règles devenues alternatives, numéro de semaine ISO 8601). Avant de
mettre un écran à jour :

```bash
npm run rapport:horaires                       # compare l'ancien et le nouveau
node tools/rapport-horaires.mjs --convertir    # applique les conversions proposées
```

Le détail des cas rencontrés est dans [ECRANS-V2.md, §4.2](ECRANS-V2.md).
