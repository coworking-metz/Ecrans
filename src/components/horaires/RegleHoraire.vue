<script setup>
/** Une règle de plage horaire, en mode assisté. */
import { computed } from "vue";
import { JOURS, describeRule } from "@/core/schedule.js";

const props = defineProps({
  regle: { type: Object, required: true },
  numero: { type: Number, required: true },
  avecPriorite: { type: Boolean, default: true },
});

const emit = defineEmits(["modifier", "supprimer"]);

const jours = computed(() => (Array.isArray(props.regle.days) ? props.regle.days : []));
const tousLesJours = computed(() => jours.value.length === 0);

const modeSemaine = computed(() => {
  const s = props.regle.weekNumberIs ?? "";
  if (s === "") return "toutes";
  if (s === "even" || s === "odd") return s;
  return "numero";
});

const resume = computed(() => describeRule(props.regle));

function majJour(cle, coche) {
  const base = tousLesJours.value ? JOURS.map((j) => j.cle) : [...jours.value];
  const suivant = coche
    ? [...new Set([...base, cle])]
    : base.filter((c) => c !== cle);
  // Sept jours cochés = aucune restriction : on n'écrit pas la liste complète.
  emit("modifier", { days: suivant.length === 7 ? [] : suivant });
}

function majSemaine(mode) {
  if (mode === "toutes") emit("modifier", { weekNumberIs: "" });
  else if (mode === "numero") emit("modifier", { weekNumberIs: "1" });
  else emit("modifier", { weekNumberIs: mode });
}

const JOURS_SEMAINE = ["monday", "tuesday", "wednesday", "thursday", "friday"];
</script>

<template>
  <div class="box regle">
    <div class="regle-entete">
      <span class="heading mb-0">Règle {{ numero }}</span>
      <button
        class="delete"
        type="button"
        title="Supprimer cette règle"
        @click="emit('supprimer')"
      ></button>
    </div>

    <div class="field">
      <label class="label is-small">Jours</label>
      <div class="jours">
        <label
          v-for="jour in JOURS"
          :key="jour.cle"
          class="checkbox jour"
          :class="{ 'est-coche': tousLesJours || jours.includes(jour.cle) }"
          :title="jour.nom"
        >
          <input
            type="checkbox"
            :checked="tousLesJours || jours.includes(jour.cle)"
            @change="majJour(jour.cle, $event.target.checked)"
          />
          <span>{{ jour.court }}</span>
        </label>

        <div class="jours-raccourcis">
          <button class="button is-small is-light" type="button" @click="emit('modifier', { days: [] })">
            Tous
          </button>
          <button
            class="button is-small is-light"
            type="button"
            @click="emit('modifier', { days: JOURS_SEMAINE })"
          >
            Semaine
          </button>
        </div>
      </div>
    </div>

    <div class="field is-grouped horaires-bornes">
      <div class="field">
        <label class="label is-small">De</label>
        <input
          class="input is-small"
          type="time"
          :value="regle.start || ''"
          @change="emit('modifier', { start: $event.target.value })"
        />
      </div>
      <div class="field">
        <label class="label is-small">à</label>
        <input
          class="input is-small"
          type="time"
          :value="regle.end || ''"
          @change="emit('modifier', { end: $event.target.value })"
        />
      </div>
    </div>

    <div class="field">
      <label class="label is-small">Semaines</label>
      <div class="control semaines">
        <label class="radio">
          <input
            type="radio"
            :name="`semaine-${numero}`"
            :checked="modeSemaine === 'toutes'"
            @change="majSemaine('toutes')"
          />
          Toutes
        </label>
        <label class="radio">
          <input
            type="radio"
            :name="`semaine-${numero}`"
            :checked="modeSemaine === 'even'"
            @change="majSemaine('even')"
          />
          Paires
        </label>
        <label class="radio">
          <input
            type="radio"
            :name="`semaine-${numero}`"
            :checked="modeSemaine === 'odd'"
            @change="majSemaine('odd')"
          />
          Impaires
        </label>
        <label class="radio">
          <input
            type="radio"
            :name="`semaine-${numero}`"
            :checked="modeSemaine === 'numero'"
            @change="majSemaine('numero')"
          />
          Numéro
        </label>
        <input
          v-if="modeSemaine === 'numero'"
          class="input is-small numero-semaine"
          type="number"
          min="1"
          max="53"
          :value="regle.weekNumberIs"
          @change="emit('modifier', { weekNumberIs: $event.target.value })"
        />
      </div>
    </div>

    <div v-if="avecPriorite" class="field options-diffusion">
      <label class="checkbox">
        <input
          type="checkbox"
          :checked="!!regle.priority"
          @change="emit('modifier', { priority: $event.target.checked })"
        />
        Slide prioritaire
        <span class="help is-inline">
          — pendant cette plage, il écarte tous les slides non permanents de l'écran.
        </span>
      </label>
      <label class="checkbox">
        <input
          type="checkbox"
          :checked="!!regle.always"
          @change="emit('modifier', { always: $event.target.checked })"
        />
        Diffusion permanente
        <span class="help is-inline"> — il résiste aux slides prioritaires.</span>
      </label>
    </div>

    <p class="regle-resume">{{ resume }}</p>
  </div>
</template>
