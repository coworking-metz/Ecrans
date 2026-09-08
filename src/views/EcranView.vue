<script setup>
/** Fiche de configuration d'un écran. */
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";

import { useDonneesStore } from "@/stores/donnees.js";
import { ecrans as apiEcrans } from "@/core/api.js";
import SelecteurMedia from "@/components/medias/SelecteurMedia.vue";
import EditeurHoraires from "@/components/horaires/EditeurHoraires.vue";
import { message, erreur } from "@/composables/messages.js";

const route = useRoute();
const router = useRouter();
const donnees = useDonneesStore();

const source = computed(() => donnees.ecranParId(route.params.id));

// Copie de travail : rien n'est écrit tant que l'utilisateur ne valide pas.
const brouillon = reactive({});
const modifie = ref(false);
let initialisation = true;

function initialiser() {
  if (!source.value) return;
  initialisation = true;
  Object.assign(brouillon, JSON.parse(JSON.stringify(source.value)));
  modifie.value = false;
  // Laisse passer le cycle de rendu déclenché par l'affectation ci-dessus.
  queueMicrotask(() => (initialisation = false));
}

watch(source, initialiser, { immediate: true });

// Un objet réactif passé directement à `watch` est surveillé en profondeur.
watch(brouillon, () => {
  if (!initialisation) modifie.value = true;
});

async function enregistrer() {
  try {
    await apiEcrans.save(brouillon);
    await donnees.recharger();
    modifie.value = false;
    message("Écran enregistré.");
  } catch (e) {
    erreur(e);
  }
}

async function supprimer() {
  if (
    !window.confirm(
      `Supprimer l'écran « ${source.value.name} » ? Les slides associés ne seront pas effacés.`
    )
  ) {
    return;
  }
  try {
    await apiEcrans.remove(source.value.id);
    await donnees.recharger();
    modifie.value = false;
    message("Écran supprimé.");
    router.push("/");
  } catch (e) {
    erreur(e);
  }
}

/* ---- Avertissement avant de quitter -------------------------------------- */

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
  <div v-if="!source" class="notification is-warning">Écran introuvable.</div>

  <form v-else @submit.prevent="enregistrer">
    <div class="buttons are-small">
      <RouterLink class="button is-small" to="/">← Retour aux écrans</RouterLink>
      <RouterLink class="button is-small" :to="`/ecran/${source.id}/slides`">
        Slides de cet écran
      </RouterLink>
    </div>

    <h1 class="title is-4">Écran « {{ source.name }} »</h1>

    <div class="columns">
      <div class="column">
        <div class="field">
          <label class="label">Nom de l'écran</label>
          <div class="control">
            <input v-model="brouillon.name" class="input" type="text" />
          </div>
          <p class="help">Sert à retrouver l'écran dans l'administration.</p>
        </div>

        <div class="field">
          <label class="label">Adresse courte (slug)</label>
          <div class="control">
            <input v-model.trim="brouillon.slug" class="input" type="text" />
          </div>
          <p class="help">
            Identifiant utilisé dans l'adresse de diffusion, à paramétrer sur le téléviseur.
          </p>
        </div>
      </div>

      <div class="column">
        <SelecteurMedia v-model="brouillon.image" libelle="Image d'illustration" />
      </div>
    </div>

    <hr />

    <!-- Barre latérale -->
    <div class="field">
      <label class="checkbox">
        <input v-model="brouillon.show_side" type="checkbox" />
        Afficher une barre latérale sur cet écran
      </label>
    </div>

    <div v-if="brouillon.show_side" class="box">
      <div class="field">
        <label class="label">Adresse de la page à afficher</label>
        <div class="control">
          <input v-model="brouillon.side_url" class="input" type="url" placeholder="https://…" />
        </div>
      </div>

      <!-- Priorité et permanence n'ont pas de sens pour une barre latérale. -->
      <EditeurHoraires v-model="brouillon.side_times" :avec-priorite="false" />
    </div>

    <hr />

    <!-- Playlist -->
    <div class="field">
      <label class="checkbox">
        <input v-model="brouillon.playlist_on" type="checkbox" />
        Diffuser une playlist audio
      </label>
    </div>

    <div v-if="brouillon.playlist_on" class="box">
      <div class="field">
        <label class="label">Morceaux à diffuser</label>
        <div class="control">
          <textarea
            v-model="brouillon.playlist"
            class="textarea is-small"
            rows="6"
            placeholder="https://…/morceau-1.mp3&#10;https://…/morceau-2.mp3"
          ></textarea>
        </div>
        <p class="help">
          Une adresse de fichier audio par ligne. La liste est mélangée puis jouée en boucle.
        </p>
      </div>

      <div class="field">
        <label class="label">Volume</label>
        <div class="control is-flex is-align-items-center">
          <input
            v-model.number="brouillon.playlist_volume"
            type="range"
            min="0"
            max="100"
            step="5"
          />
          <span class="ml-2">{{ brouillon.playlist_volume ?? 50 }} %</span>
        </div>
      </div>
    </div>

    <hr />

    <nav class="level is-mobile">
      <div class="level-left">
        <a class="level-item has-text-danger" @click="supprimer">🗑 Supprimer cet écran</a>
      </div>
    </nav>
    <p class="help">
      Les slides rattachés à cet écran ne seront pas supprimés : ils restent disponibles pour les
      autres écrans.
    </p>

    <div class="buttons validation-bar">
      <button class="button is-primary" :class="{ 'is-light': !modifie }" type="submit">
        Valider
      </button>
      <RouterLink class="button is-text" :to="`/ecran/${source.id}/slides`">Retour</RouterLink>
      <span v-if="modifie" class="has-text-grey ml-2">Modifications non enregistrées</span>
    </div>
  </form>
</template>
