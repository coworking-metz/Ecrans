<script setup>
/** Fiche d'un slide : paramètres, contenu, horaires, état et aperçu. */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import { useDonneesStore } from "@/stores/donnees.js";
import { slides as apiSlides, liens as apiLiens } from "@/core/api.js";
import { computeSlideStateGlobal } from "@/core/state.js";
import { TYPES, metaParDefaut, nettoyerEmoji } from "@/core/slide-types.js";
import { formatDateHeure, versChampDateHeure, depuisChampDateHeure } from "@/core/dates.js";

import SlideRender from "@/components/slides/SlideRender.vue";
import EditeurTexte from "@/components/slides/EditeurTexte.vue";
import EditeurHoraires from "@/components/horaires/EditeurHoraires.vue";
import SelecteurMedia from "@/components/medias/SelecteurMedia.vue";
import EtatBandeau from "@/components/etat/EtatBandeau.vue";
import { message, erreur } from "@/composables/messages.js";

const route = useRoute();
const router = useRouter();
const donnees = useDonneesStore();

const source = computed(() => donnees.slideParId(route.params.id));

const brouillon = reactive({ meta: {} });
const ecransIds = ref([]);
const modifie = ref(false);
let initialisation = true;

function initialiser() {
  if (!source.value) return;
  initialisation = true;
  Object.assign(brouillon, JSON.parse(JSON.stringify(source.value)));
  ecransIds.value = donnees.ecransDuSlide(source.value.id).map((e) => e.id);
  modifie.value = false;
  queueMicrotask(() => (initialisation = false));
}

watch(source, initialiser, { immediate: true });

watch(
  () => [JSON.stringify(brouillon), [...ecransIds.value].join(",")],
  () => {
    if (!initialisation) modifie.value = true;
  }
);

/* ---- Contenu ------------------------------------------------------------- */

function changerType(type) {
  brouillon.type = type;
  // On complète avec les valeurs par défaut du nouveau type, sans effacer ce
  // qui était déjà saisi.
  brouillon.meta = { ...metaParDefaut(type), ...brouillon.meta };
}

function surEmoji(e) {
  const propre = nettoyerEmoji(e.target.value);
  e.target.value = propre;
  brouillon.meta.emojiPrincipal = propre;
}

const aUneImagePrincipale = computed(() => !!brouillon.meta?.imagePrincipale);
const aUnEmoji = computed(() => !!brouillon.meta?.emojiPrincipal);
const aUneImage = computed(() => !!brouillon.meta?.image);

const publication = computed({
  get: () => versChampDateHeure(brouillon.publication),
  set: (v) => (brouillon.publication = depuisChampDateHeure(v)),
});

const expiration = computed({
  get: () => versChampDateHeure(brouillon.expiration),
  set: (v) => (brouillon.expiration = depuisChampDateHeure(v)),
});

/**
 * On mesure la vidéo et on propose sa durée réelle : en v1, une durée mal
 * réglée coupait la vidéo ou laissait un écran figé.
 */
function proposerDuree(url) {
  if (!url) return;
  const sonde = document.createElement("video");
  sonde.preload = "metadata";
  sonde.src = url;
  sonde.onloadedmetadata = () => {
    const duree = Math.ceil(sonde.duration);
    if (!Number.isFinite(duree) || duree <= 0 || duree === brouillon.duration) return;
    message(`La vidéo dure ${duree} s. Ajuster la durée du slide ?`, {
      ton: "info",
      duree: 15000,
      action: {
        label: `Régler sur ${duree} s`,
        onClick: () => (brouillon.duration = duree),
      },
    });
  };
}

/* ---- État ---------------------------------------------------------------- */

const etat = computed(() => {
  if (!source.value) return null;
  const ecrans = donnees.ecrans.filter((e) => ecransIds.value.includes(e.id));
  return computeSlideStateGlobal(
    { ...brouillon, id: source.value.id },
    {
      now: donnees.maintenant,
      ecrans,
      liens: donnees.liens,
      slidesParEcran: donnees.slidesParEcran,
    }
  );
});

function surCorrection(correction) {
  switch (correction.action) {
    case "activer":
      brouillon.active = true;
      break;
    case "expiration":
      brouillon.expiration = null;
      break;
    case "publication":
      brouillon.publication = null;
      break;
    case "voir-slide":
      router.push(`/slide/${correction.id}`);
      break;
    default:
      break;
  }
}

/* ---- Enregistrement ------------------------------------------------------ */

async function enregistrer() {
  try {
    await apiSlides.save(brouillon);
    await apiLiens.setEcransDuSlide(source.value.id, ecransIds.value);
    await donnees.recharger();
    modifie.value = false;
    message("Slide enregistré.");
  } catch (e) {
    erreur(e);
  }
}

function avantFermeture(e) {
  if (!modifie.value) return;
  e.preventDefault();
  e.returnValue = "";
}

onMounted(() => window.addEventListener("beforeunload", avantFermeture));
onBeforeUnmount(() => window.removeEventListener("beforeunload", avantFermeture));

onBeforeRouteLeave(() => {
  if (!modifie.value) return true;
  return window.confirm("Des modifications n'ont pas été enregistrées. Quitter quand même ?");
});
</script>

<template>
  <div v-if="!source" class="notification is-warning">Slide introuvable.</div>

  <form v-else @submit.prevent="enregistrer">
    <div class="buttons are-small">
      <RouterLink class="button is-small" to="/slides">← Tous les slides</RouterLink>
      <a
        class="button is-small"
        :href="`/visionner/slide/${source.id}`"
        target="_blank"
        rel="noreferrer"
      >
        <span class="icon is-small"><i class="fas fa-tv"></i></span>
        <span>Aperçu plein écran</span>
      </a>
    </div>

    <h1 class="title is-4">{{ brouillon.name || "(sans nom)" }}</h1>

    <div class="columns">
      <!-- Identité et diffusion -->
      <div class="column is-4">
        <div class="field">
          <label class="label">Nom du slide</label>
          <div class="control">
            <input v-model="brouillon.name" class="input" type="text" />
          </div>
          <p class="help">Sert à retrouver le slide dans l'administration.</p>
        </div>

        <div class="field">
          <label class="label">Diffusion</label>
          <div class="control">
            <label class="interrupteur est-grand" :class="{ 'est-actif': brouillon.active }">
              <input v-model="brouillon.active" type="checkbox" />
              <span>{{ brouillon.active ? "ON" : "OFF" }}</span>
            </label>
            <p v-if="ecransIds.length > 1 && brouillon.active" class="help has-text-warning-dark">
              ⚠️ Ce slide est diffusé sur {{ ecransIds.length }} écrans : le désactiver le coupe
              partout.
            </p>
          </div>
        </div>

        <div class="columns is-mobile">
          <div class="column">
            <div class="field">
              <label class="label">Type</label>
              <div class="control">
                <div class="select is-fullwidth">
                  <select :value="brouillon.type" @change="changerType($event.target.value)">
                    <option v-for="t in TYPES" :key="t.slug" :value="t.slug">{{ t.nom }}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="column">
            <div class="field">
              <label class="label">Durée (secondes)</label>
              <div class="control">
                <input v-model.number="brouillon.duration" class="input" type="number" min="1" />
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="label">Date de publication</label>
          <div class="control">
            <input v-model="publication" class="input" type="datetime-local" />
          </div>
          <p class="help">Le slide n'apparaît pas avant cette date.</p>
        </div>

        <div class="field">
          <label class="label">Date d'expiration</label>
          <div class="control">
            <input v-model="expiration" class="input" type="datetime-local" />
          </div>
          <p class="help">Le slide disparaît automatiquement après cette date.</p>
        </div>

        <div class="field">
          <label class="label">Écrans de diffusion</label>
          <div class="control">
            <div class="select is-multiple is-fullwidth">
              <select
                v-model="ecransIds"
                multiple
                :size="Math.min(8, Math.max(3, donnees.ecrans.length))"
              >
                <option v-for="e in donnees.ecrans" :key="e.id" :value="e.id">{{ e.name }}</option>
              </select>
            </div>
          </div>
          <p v-if="ecransIds.length === 0" class="help">
            ⚠️ Aucun écran : ce slide ne passera nulle part.
          </p>
        </div>
      </div>

      <!-- Contenu -->
      <div class="column">
        <template v-if="brouillon.type === 'default'">
          <div class="columns">
            <div
              class="column"
              :style="aUneImagePrincipale ? { opacity: 0.4, pointerEvents: 'none' } : {}"
            >
              <div class="field">
                <label class="label">Emoji principal</label>
                <div class="control">
                  <input
                    class="input"
                    type="text"
                    autocomplete="off"
                    spellcheck="false"
                    :value="brouillon.meta.emojiPrincipal || ''"
                    @input="surEmoji"
                  />
                </div>
                <p class="help">Un seul emoji, affiché en grand au-dessus du texte.</p>
              </div>
            </div>

            <div class="column" :style="aUnEmoji ? { opacity: 0.4, pointerEvents: 'none' } : {}">
              <SelecteurMedia
                v-model="brouillon.meta.imagePrincipale"
                libelle="… ou image principale"
              />
            </div>
          </div>

          <div class="field">
            <label class="label">Titre</label>
            <div class="control">
              <input v-model="brouillon.meta.titre" class="input" type="text" />
            </div>
          </div>

          <div class="field">
            <label class="label">Texte</label>
            <div class="control">
              <EditeurTexte v-model="brouillon.meta.texte" />
            </div>
          </div>

          <div class="columns">
            <div class="column is-half">
              <div class="field">
                <label class="label">Couleur du texte</label>
                <div class="control champ-couleur">
                  <input v-model="brouillon.meta.color" type="color" class="input" />
                  <input v-model="brouillon.meta.color" type="text" class="input" />
                </div>
              </div>
            </div>
          </div>

          <div class="field">
            <label class="label">Adresse à afficher en QR code</label>
            <div class="control">
              <input v-model="brouillon.meta.url" class="input" type="url" placeholder="https://…" />
            </div>
            <p class="help">Un QR code est incrusté en bas à droite du slide.</p>
          </div>

          <hr />
          <p class="heading">Image de fond</p>
        </template>

        <!-- Image de fond : commune à la composition et au type « image » -->
        <template v-if="brouillon.type === 'default' || brouillon.type === 'image'">
          <SelecteurMedia
            v-model="brouillon.meta.image"
            :libelle="brouillon.type === 'image' ? 'Image' : 'Image de fond'"
          />

          <div class="columns">
            <div v-if="aUneImage" class="column">
              <div class="field">
                <label class="label">Ajustement</label>
                <div class="control">
                  <div class="select is-fullwidth">
                    <select v-model="brouillon.meta.fit">
                      <option value="cover">Remplir (cover)</option>
                      <option value="contain">Entière (contain)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="aUneImage" class="column">
              <div class="field">
                <label class="label">
                  Opacité — {{ Math.round((brouillon.meta.opacity ?? 1) * 100) }} %
                </label>
                <div class="control">
                  <input
                    v-model.number="brouillon.meta.opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div class="column">
              <div class="field">
                <label class="label">Couleur de fond</label>
                <div class="control champ-couleur">
                  <input v-model="brouillon.meta.backgroundColor" type="color" class="input" />
                  <input v-model="brouillon.meta.backgroundColor" type="text" class="input" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="brouillon.type === 'video'">
          <SelecteurMedia
            v-model="brouillon.meta.video"
            libelle="Vidéo"
            @update:model-value="proposerDuree"
          />
          <p class="help">
            La vidéo est lue automatiquement, sans son. La durée du slide doit correspondre à sa
            longueur.
          </p>
        </template>

        <template v-else-if="brouillon.type === 'url'">
          <div class="field">
            <label class="label">Adresse de la page à afficher</label>
            <div class="control">
              <input v-model="brouillon.meta.url" class="input" type="url" placeholder="https://…" />
            </div>
            <p class="help">La page occupe toute la surface du slide.</p>
          </div>
        </template>
      </div>

      <!-- Contrôle -->
      <div class="column is-3">
        <div class="apercu-tv">
          <p class="heading">Aperçu</p>
          <div class="tv">
            <div class="tv-ecran">
              <!-- Le même rendu que le lecteur : aucune divergence possible. -->
              <SlideRender
                :key="brouillon.type"
                :slide="{ ...brouillon, id: source.id }"
                :largeur-image="800"
              />
            </div>
          </div>
        </div>

        <EtatBandeau
          v-if="etat"
          :etat="etat"
          :slide="{ ...brouillon, id: source.id }"
          @corriger="surCorrection"
        />

        <div class="mt-4">
          <EditeurHoraires v-model="brouillon.display_times" />
        </div>
      </div>
    </div>

    <p class="help mt-4">
      Créé le {{ formatDateHeure(source.created_at) }} · dernière modification le
      {{ formatDateHeure(source.updated_at) }}
    </p>

    <div class="buttons validation-bar">
      <button class="button is-primary" :class="{ 'is-light': !modifie }" type="submit">
        Valider
      </button>
      <RouterLink class="button is-text" to="/slides">Retour</RouterLink>
      <span v-if="modifie" class="has-text-grey ml-2">Modifications non enregistrées</span>
    </div>
  </form>
</template>
