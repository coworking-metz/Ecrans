<script setup>
import { computed, ref } from "vue";
import MediaLigne from "./MediaLigne.vue";
import { useMediasStore } from "@/stores/medias.js";
import { message, erreur } from "@/composables/messages.js";

const props = defineProps({
  selectionnable: { type: Boolean, default: false },
  selectionne: { type: String, default: null },
  avecSuppression: { type: Boolean, default: false },
  hauteurMax: { type: String, default: null },
});

const emit = defineEmits(["choisir"]);

const medias = useMediasStore();
const recherche = ref("");

const filtres = computed(() => medias.rechercher(recherche.value));

async function supprimer(media) {
  if (!window.confirm(`Effacer le fichier « ${media.nom} » ?`)) return;
  try {
    await medias.supprimer(media.nom);
    message("Fichier supprimé.");
  } catch (e) {
    erreur(e);
  }
}
</script>

<template>
  <div>
    <div class="field mb-2">
      <p class="control has-icons-left">
        <input
          v-model="recherche"
          class="input is-small"
          type="search"
          placeholder="Rechercher un fichier…"
        />
        <span class="icon is-small is-left"><i class="fas fa-magnifying-glass"></i></span>
      </p>
    </div>

    <div
      class="medias-liste"
      :style="hauteurMax ? { maxHeight: hauteurMax, overflowY: 'auto' } : {}"
    >
      <p v-if="filtres.length === 0" class="has-text-grey p-4">
        {{ recherche ? "Aucun fichier ne correspond." : "Aucun fichier." }}
      </p>

      <MediaLigne
        v-for="media in filtres"
        :key="media.nom"
        :media="media"
        :selectionnable="selectionnable"
        :selectionne="props.selectionne === media.url"
        :avec-suppression="avecSuppression"
        @choisir="emit('choisir', $event)"
        @supprimer="supprimer"
      />
    </div>
  </div>
</template>
