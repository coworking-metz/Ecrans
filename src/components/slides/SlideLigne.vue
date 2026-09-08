<script setup>
import { computed } from "vue";
import EtatPastille from "@/components/etat/EtatPastille.vue";
import InterrupteurSlide from "./InterrupteurSlide.vue";
import { nomDuType } from "@/core/slide-types.js";
import { describeSchedule } from "@/core/schedule.js";
import { formatDuree } from "@/core/dates.js";
import { urlLecteur } from "@/core/media.js";

const props = defineProps({
  slide: { type: Object, required: true },
  etat: { type: Object, required: true },
  ecrans: { type: Array, default: () => [] },
  /** Écran de référence (page d'un écran, ou filtre par écran). */
  contexte: { type: Object, default: null },
  selectionne: { type: Boolean, default: false },
  corbeille: { type: Boolean, default: false },
  deplacable: { type: Boolean, default: false },
});

const emit = defineEmits([
  "selection",
  "basculer",
  "intention",
  "corriger",
  "dupliquer",
  "corbeille",
  "restaurer",
  "reordonner",
]);

const typeLisible = computed(() => nomDuType(props.slide.type));
const dureeLisible = computed(() => formatDuree(props.slide.duration));
const horairesLisibles = computed(() => describeSchedule(props.slide.display_times));
const lienApercu = computed(() => urlLecteur({ slideId: props.slide.id }));

function surDebutGlisser(e) {
  e.dataTransfer.setData("text/plain", String(props.slide.id));
  e.dataTransfer.effectAllowed = "move";
}

function surDepot(e) {
  const source = Number(e.dataTransfer.getData("text/plain"));
  if (source && source !== props.slide.id) {
    emit("reordonner", { source, cible: props.slide.id });
  }
}
</script>

<template>
  <article
    class="slide-ligne"
    :class="{ 'est-selectionne': selectionne }"
    :data-id="slide.id"
    :draggable="deplacable"
    @dragstart="surDebutGlisser"
    @dragover.prevent
    @drop.prevent="surDepot"
  >
    <label class="checkbox slide-case">
      <input
        type="checkbox"
        :checked="selectionne"
        @change="emit('selection', $event.target.checked)"
      />
    </label>

    <span v-if="deplacable" class="poignee" title="Glisser pour réordonner">
      <span class="icon is-small"><i class="fas fa-grip-vertical"></i></span>
    </span>

    <div class="slide-principal">
      <div class="slide-titre">
        <RouterLink class="slide-nom" :to="`/slide/${slide.id}`">
          {{ slide.name || "(sans nom)" }}
        </RouterLink>
        <span class="tag is-light ml-2">{{ typeLisible }}</span>
        <span class="tag is-light ml-1" title="Durée d'affichage">{{ dureeLisible }}</span>
        <span v-if="slide.display_times" class="ml-1" :title="horairesLisibles">⏱️</span>
      </div>
      <div class="slide-message has-text-grey">{{ etat.message }}</div>
    </div>

    <div class="slide-ecrans">
      <RouterLink
        v-for="ecran in ecrans"
        :key="ecran.id"
        class="tag is-primary is-light"
        :to="`/ecran/${ecran.id}/slides`"
      >
        {{ ecran.name }}
      </RouterLink>
    </div>

    <div class="slide-etat">
      <EtatPastille :etat="etat" :slide="slide" @corriger="emit('corriger', $event)" />
    </div>

    <div class="slide-actions">
      <template v-if="!corbeille">
        <RouterLink class="action" :to="`/slide/${slide.id}`" title="Modifier">
          <span class="icon is-small"><i class="fas fa-pen"></i></span>
        </RouterLink>
        <a class="action" :href="lienApercu" target="_blank" rel="noreferrer" title="Aperçu">
          <span class="icon is-small"><i class="fas fa-tv"></i></span>
        </a>
        <a class="action" title="Dupliquer" @click="emit('dupliquer')">
          <span class="icon is-small"><i class="fas fa-copy"></i></span>
        </a>
        <a class="action" title="Mettre à la corbeille" @click="emit('corbeille')">
          <span class="icon is-small"><i class="fas fa-trash"></i></span>
        </a>
      </template>
      <a v-else class="action" title="Restaurer" @click="emit('restaurer')">
        <span class="icon is-small"><i class="fas fa-recycle"></i></span>
      </a>
    </div>

    <InterrupteurSlide
      v-if="!corbeille"
      :slide="slide"
      :ecran="contexte"
      :ecrans-du-slide="ecrans"
      @basculer="emit('basculer', $event)"
      @intention="emit('intention', $event)"
    />
  </article>
</template>
