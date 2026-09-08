<script setup>
/**
 * Éditeur de plages horaires.
 *
 * En v1, ce paramétrage se saisissait en JSON brut, et les options `priority`
 * et `always` — pourtant décisives pour la diffusion — n'apparaissaient nulle
 * part. Ici : un formulaire assisté, un résumé en français, un verdict
 * immédiat, et un mode expert conservé pour les cas particuliers.
 */
import { computed, ref, watch } from "vue";
import RegleHoraire from "./RegleHoraire.vue";
import { message } from "@/composables/messages.js";
import {
  parseSchedule,
  serializeSchedule,
  isInTimeRange,
  nextChange,
} from "@/core/schedule.js";
import { formatEcheance } from "@/core/dates.js";

const props = defineProps({
  modelValue: { type: String, default: "" },
  avecPriorite: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue"]);

/** Clés que le mode assisté sait représenter. */
const CLES_CONNUES = new Set(["days", "start", "end", "weekNumberIs", "priority", "always"]);
const contientClesInconnues = (rules) =>
  rules.some((r) => Object.keys(r).some((c) => !CLES_CONNUES.has(c)));

const RACCOURCIS = [
  {
    label: "Heures d'ouverture",
    regle: {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      start: "08:30",
      end: "19:00",
    },
  },
  { label: "Le midi", regle: { start: "11:30", end: "14:00" } },
  { label: "Le week-end", regle: { days: ["saturday", "sunday"], start: "09:00", end: "20:00" } },
  { label: "Une semaine sur deux", regle: { weekNumberIs: "even", start: "09:00", end: "18:00" } },
];

const analyseInitiale = parseSchedule(props.modelValue);
const regles = ref(analyseInitiale.rules.map((r) => ({ ...r })));
const brut = ref(props.modelValue || "");
// Un JSON illisible ou porteur de clés inconnues ouvre directement en mode
// expert : on ne réécrit jamais en silence un paramétrage qu'on ne comprend pas.
const expert = ref(!!analyseInitiale.erreur || contientClesInconnues(analyseInitiale.rules));

/** Le parent peut remplacer la valeur (chargement, correction) : on se resynchronise. */
watch(
  () => props.modelValue,
  (valeur) => {
    if (valeur === valeurCourante()) return;
    const analyse = parseSchedule(valeur);
    regles.value = analyse.rules.map((r) => ({ ...r }));
    brut.value = valeur || "";
    expert.value = !!analyse.erreur || contientClesInconnues(analyse.rules);
  }
);

function valeurCourante() {
  return expert.value ? brut.value : serializeSchedule(regles.value);
}

function emettre() {
  emit("update:modelValue", valeurCourante());
}

function modifierRegle(index, patch) {
  const suivante = { ...regles.value[index], ...patch };
  // On ne conserve pas les clés vides : le JSON reste lisible.
  for (const [cle, v] of Object.entries(suivante)) {
    if (v === "" || v === null || v === undefined || v === false) delete suivante[cle];
    if (Array.isArray(v) && v.length === 0) delete suivante[cle];
  }
  regles.value[index] = suivante;
  emettre();
}

function ajouterRegle(regle = { start: "09:00", end: "18:00" }) {
  regles.value.push({ ...regle });
  emettre();
}

function supprimerRegle(index) {
  regles.value.splice(index, 1);
  emettre();
}

function passerEnAssiste() {
  if (!expert.value) return;
  const analyse = parseSchedule(brut.value);
  if (analyse.erreur) {
    message("Le JSON doit être valide avant de revenir au mode assisté.", { ton: "warning" });
    return;
  }
  if (contientClesInconnues(analyse.rules)) {
    message(
      "Ce paramétrage contient des options que le mode assisté ne sait pas afficher : il resterait incomplet. Modification en mode expert uniquement.",
      { ton: "warning", duree: 10000 }
    );
    return;
  }
  regles.value = analyse.rules.map((r) => ({ ...r }));
  expert.value = false;
  emettre();
}

function passerEnExpert() {
  if (expert.value) return;
  brut.value = serializeSchedule(regles.value);
  expert.value = true;
  emettre();
}

/* ---- Verdict ------------------------------------------------------------- */

const analyse = computed(() => parseSchedule(valeurCourante()));
const passeMaintenant = computed(() => isInTimeRange(valeurCourante(), new Date()));
const bascule = computed(() => nextChange(valeurCourante(), new Date()));

const verdict = computed(() => {
  if (analyse.value.erreur) {
    return {
      ton: "danger",
      texte: `⛔ ${analyse.value.erreur} — tant que le paramétrage est illisible, le slide est diffusé en permanence.`,
    };
  }
  if (analyse.value.vide) {
    return { ton: "info", texte: "🟢 Aucune restriction : diffusion permanente." };
  }
  if (passeMaintenant.value) {
    return {
      ton: "success",
      texte: `🟢 Ce slide passe en ce moment${
        bascule.value ? `, jusqu'${formatEcheance(bascule.value)}` : ""
      }.`,
    };
  }
  return {
    ton: "warning",
    texte: `🟡 Ce slide ne passe pas en ce moment${
      bascule.value
        ? ` — reprise ${formatEcheance(bascule.value)}`
        : " et aucune reprise n'est prévue"
    }.`,
  };
});

const EXEMPLE = `[
  {
    "days": ["monday", "wednesday", "friday"],
    "start": "09:00",
    "end": "12:30",
    "weekNumberIs": "odd"
  }
]`;
</script>

<template>
  <div class="editeur-horaires">
    <div class="horaires-entete">
      <label class="label mb-0">Horaires d'affichage</label>
      <div class="buttons are-small mb-0">
        <button
          class="button is-small"
          :class="{ 'is-link is-light': !expert }"
          type="button"
          @click="passerEnAssiste"
        >
          Assisté
        </button>
        <button
          class="button is-small"
          :class="{ 'is-link is-light': expert }"
          type="button"
          @click="passerEnExpert"
        >
          Expert (JSON)
        </button>
      </div>
    </div>

    <div v-if="expert">
      <textarea
        v-model="brut"
        class="textarea is-small is-family-monospace"
        rows="12"
        spellcheck="false"
        :placeholder="EXEMPLE"
        @input="emettre"
      ></textarea>
      <p class="help">
        Un tableau de règles. Les règles sont alternatives : le slide passe si au moins l'une
        d'elles est satisfaite.
      </p>
    </div>

    <div v-else>
      <p v-if="regles.length === 0" class="notification is-light py-2">
        Aucune restriction : ce slide est diffusable en permanence.
      </p>

      <RegleHoraire
        v-for="(regle, i) in regles"
        :key="i"
        :regle="regle"
        :numero="i + 1"
        :avec-priorite="avecPriorite"
        @modifier="modifierRegle(i, $event)"
        @supprimer="supprimerRegle(i)"
      />

      <div class="buttons are-small mt-2">
        <button class="button is-small" type="button" @click="ajouterRegle()">
          <span class="icon is-small"><i class="fas fa-plus"></i></span>
          <span>Ajouter une règle</span>
        </button>
        <button
          v-for="raccourci in RACCOURCIS"
          :key="raccourci.label"
          class="button is-small is-light"
          type="button"
          @click="ajouterRegle(raccourci.regle)"
        >
          {{ raccourci.label }}
        </button>
      </div>
    </div>

    <p class="notification py-2" :class="`is-${verdict.ton} is-light`">{{ verdict.texte }}</p>
  </div>
</template>
