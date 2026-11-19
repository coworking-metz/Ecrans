<script setup>
import { computed, onMounted, ref } from "vue";
import { checkAuth, login } from "@/core/auth.js";
import { useDonneesStore } from "@/stores/donnees.js";
import { useMediasStore } from "@/stores/medias.js";
import { ouvrirLiaison, useLiaison } from "@/composables/liaison.js";
import NavBar from "@/components/ui/NavBar.vue";
import MessagesFlottants from "@/components/ui/MessagesFlottants.vue";

const donnees = useDonneesStore();
const medias = useMediasStore();
const { etatLiaison } = useLiaison();

const autorise = ref(false);
const verifie = ref(false);
const erreurAuth = ref("");

/**
 * Connexion par SSO WordPress, réservée aux administrateurs.
 *
 * Ce n'est pas un mécanisme de sécurité (vérifié côté navigateur) : la
 * protection réelle des données repose sur les règles d'accès du service de
 * données.
 */
async function verifierAcces() {
  try {
    autorise.value = !!(await checkAuth());
  } catch (e) {
    erreurAuth.value = e.message;
  }
  verifie.value = true;
  if (autorise.value) demarrer();
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

onMounted(verifierAcces);

const liaisonRompue = computed(
  () => etatLiaison.value === "deconnectee" || etatLiaison.value === "erreur"
);
</script>

<!--
  Racine UNIQUE, et des `v-if`/`v-else` portés par de vrais éléments.

  La version précédente avait plusieurs racines, dont un `<template v-else>` à
  plusieurs enfants et un composant frère. Cette structure se compile en un
  bloc de fragments imbriqués qui plantait — et seulement en production, les
  optimisations du compilateur (blocs, hissage statique) étant désactivées en
  développement. Voir `test/bundle.test.js`, qui monte l'artefact construit.
-->
<template>
  <div class="application">
    <!-- Écran de connexion -->
    <div v-if="verifie && !autorise" class="connexion">
      <img src="/logo.svg" alt="" width="64" height="64" />
      <h1 class="title is-5 mt-4">Écrans</h1>
      <p v-if="erreurAuth" class="has-text-danger mb-3">{{ erreurAuth }}</p>
      <button class="button is-link" @click="login">Se connecter avec Coworking Metz</button>
    </div>

    <div v-else-if="autorise" class="administration">
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
    </div>

    <MessagesFlottants />
  </div>
</template>
