# Écrans — affichage dynamique

Application de *digital signage* de l'espace de coworking : composition de
contenus (**slides**), regroupement en diaporamas, diffusion en boucle sur les
téléviseurs du lieu (**écrans**).

- **[ECRANS.md](ECRANS.md)** — documentation fonctionnelle (ce que fait l'application).
- **[ECRANS-V2.md](ECRANS-V2.md)** — spécification de la refonte en cours.

---

## Branche `v2` — réécriture en cours

La v2 est écrite en JavaScript, HTML et CSS avec Bulma, sans framework
applicatif. La v1 (Vue) reste en production jusqu'à la bascule ; son code est
conservé dans `src/` à titre de référence et sera retiré au dernier lot.

### Démarrer

```bash
npm install
cp .env.modele .env      # puis compléter la clé d'accès aux données
npm run dev              # http://localhost:5174
npm run build            # produit ./dist
npm test                 # tests de la couche métier
```

| Adresse | Contenu |
|---|---|
| `/` | Administration |
| `/visionner/<slug>` | Lecteur d'un écran (page affichée sur les téléviseurs) |
| `/visionner/slide/<id>` | Un slide isolé, plein écran |

### Organisation

```
app/
  index.html              administration
  visionner.html          lecteur
  src/
    core/                 métier, sans aucune dépendance au DOM
      config.js           toutes les adresses de services, et nulle part ailleurs
      api.js              accès aux données : opérations métier, jamais de requête brute
      schedule.js         plages horaires (analyse, évaluation, description)
      state.js            état de diffusion d'un slide + explication
      playlist.js         constitution du diaporama d'un écran
      slide-types.js      schéma des types de slides, normalisation
      store.js            état applicatif observable
      realtime.js         liaison temps réel avec les lecteurs
    render/               rendu d'un slide, PARTAGÉ administration ↔ lecteur
    ui/                   routeur, composants, vues
    admin.js              point d'entrée administration
    player.js             point d'entrée lecteur
  test/                   tests de la couche métier
build.mjs                 build esbuild + versionnement des assets
tools/rapport-horaires.mjs  outil de bascule des plages horaires
```

Deux principes structurants :

- **`core/` ne touche jamais au DOM, et le DOM ne fait jamais de requête.** C'est
  ce qui permet au lecteur et à l'administration de partager exactement les mêmes
  règles de diffusion — en v1, elles étaient réécrites à deux endroits et
  divergeaient.
- **`render/` est la seule définition du rendu d'un slide.** Toute divergence
  entre l'aperçu de l'administration et la diffusion réelle est un défaut.

### Build et cache

`npm run build` produit `./dist` (ce que Netlify publie) :

```
dist/
  index.html  visionner.html
  assets/  admin.js  admin.css  player.js  player.css  manifest.json
  fonts/ logo.svg screen.png …
  _redirects  _headers
```

Les noms de fichiers restent **stables** ; la version passe en paramètre de
requête, `admin.js?v=8f3a1c2e`, où le suffixe est un hash du contenu. Les pages
HTML ne sont jamais mises en cache, les assets versionnés le sont pour un an.

Le lecteur et l'administration sont deux bundles indépendants : le lecteur ne
charge ni Bulma, ni l'éditeur de texte, ni les vues d'administration (~17 ko
contre ~284 ko).

### Bascule des plages horaires

La v2 corrige deux défauts d'évaluation des plages horaires (règles devenues
alternatives, numéro de semaine ISO 8601). Avant de mettre un écran en v2 :

```bash
npm run rapport:horaires              # compare v1 et v2 sur 8 semaines
node tools/rapport-horaires.mjs --convertir   # applique les conversions proposées
```

Voir le détail dans [ECRANS-V2.md, §4.2](ECRANS-V2.md).

---

## v1 (Vue) — encore en production

```bash
npm run dev:v1
npm run build:v1
```
