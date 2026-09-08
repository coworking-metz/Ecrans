<script setup>
import { computed, onMounted, ref } from "vue";
import config from "@/core/config.js";
import { useDonneesStore } from "@/stores/donnees.js";
import { useMediasStore } from "@/stores/medias.js";
import { ouvrirLiaison, useLiaison } from "@/composables/liaison.js";
import NavBar from "@/components/ui/NavBar.vue";
import MessagesFlottants from "@/components/ui/MessagesFlottants.vue";

const CLE_AUTH = "auth";

const donnees = useDonneesStore();
const medias = useMediasStore();
const { etatLiaison } = useLiaison();

const saisie = ref("");
const autorise = ref(estAutorise());

/**
 * Code d'accès partagé, mémorisé sur l'appareil.
 *
 * Ce n'est pas un mécanisme de sécurité — il est vérifié côté navigateur — mais
 * un garde-fou contre les modifications accidentelles. La protection réelle des
 * données repose sur les règles d'accès du service de données.
 */
function estAutorise() {
  if (!config.password) return true;
  try {
    return localStorage.getItem(CLE_AUTH) === config.password;
  } catch {
    return false; // navigation privée, stockage bloqué
  }
}

function verifierCode() {
  if (saisie.value !== config.password) return;
  try {
    localStorage.setItem(CLE_AUTH, saisie.value);
  } catch {
    /* stockage indisponible : l'accès vaudra pour cette session */
  }
  autorise.value = true;
  demarrer();
}

async function demarrer() {
  try {
    await donnees.charger();
    donnees.demarrerHorloge();
    ouvrirLiaison();
    // Les médias ne bloquent pas l'affichage : ils arrivent quand ils arrivent.
    medias.charger().catch((e) => console.warn("[médias] liste indisponible", e));
  } catch {
    /* l'erreur est conservée dans le store et affichée ci-dessous */
  }
}

onMounted(() => {
  if (autorise.value) demarrer();
});

const liaisonRompue = computed(
  () => etatLiaison.value === "deconnectee" || etatLiaison.value === "erreur"
);
</script>

<template>
  <!-- Écran de connexion -->
  <form v-if="!autorise" class="connexion" @submit.prevent>
    <img src="/logo.svg" alt="" width="64" height="64" />
    <h1 class="title is-5 mt-4">Écrans</h1>
    <div class="field">
      <div class="control">
        <input
          v-model="saisie"
          class="input"
          type="password"
          placeholder="Code d'accès"
          autofocus
          @input="verifierCode"
        />
      </div>
    </div>
    <p class="help">Entrez le code de la boîte à clés de la réserve.</p>
  </form>

  <template v-else>
    <NavBar />

    <p v-if="liaisonRompue" class="bandeau-liaison">
      Liaison temps réel interrompue — le pilotage à distance est indisponible.
    </p>

    <div class="container is-fluid mt-4">
      <progress v-if="donnees.chargement" class="progress is-small is-primary"></progress>

      <div v-else-if="donnees.erreur" class="notification is-danger">
        <p><strong>Chargement impossible.</strong></p>
        <p>{{ donnees.erreur.message }}</p>
        <p class="mt-2">
          Vérifiez la configuration (clé d'accès aux données) et rechargez la page.
        </p>
      </div>

      <RouterView v-else />
    </div>
  </template>

  <MessagesFlottants />
</template>
