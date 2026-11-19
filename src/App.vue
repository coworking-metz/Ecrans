<script setup>
import { computed, onMounted, watch, reactive, ref } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { useRoute } from 'vue-router';
import { useEcransStore } from '@/stores/ecrans';
import { useMediasStore } from '@/stores/medias';
import { useSlidesStore } from '@/stores/slides';
import { checkAuth, login } from '@/auth';

const route = useRoute();
const ecransStore = useEcransStore();
const mediasStore = useMediasStore();
const slidesStore = useSlidesStore();

const data = reactive({
  hasNavbar: false,
  user: null,
  authChecked: false,
  error: ''
});

function start() {
  ecransStore.fetchEcrans();
  slidesStore.fetchLiens();
  slidesStore.fetchSlides();
  mediasStore.fetchMedias();

  data.hasNavbar = !route?.name?.includes('visionner');

};

const isVisionner = document.location.href.includes('visionner');

const isAuthenticated = computed(() => isVisionner || !!data.user);

if (!isVisionner) {
  checkAuth()
    .then(u => { data.user = u; })
    .catch(e => { data.error = e.message; })
    .finally(() => { data.authChecked = true; });
}

window.bus.on('loadSlides', () => {
  slidesStore.fetchSlides();
  slidesStore.fetchLiens();
});

window.bus.on('loadMedias', () => {
  mediasStore.fetchMedias();
})

onMounted(start);

watch(() => route.name, start);

const appReady = computed(() => {
  if (slidesStore.liens === null) return;
  if (slidesStore.slides === null) return;
  if (ecransStore.ecrans === null) return;
  if (mediasStore.medias === null) return;
  return true;
})


</script>


<template>
  <template v-if="isAuthenticated">
    <template v-if="appReady">
      <template v-if="data.hasNavbar">
        <nav-bar />
        <div class="container ml-5 mr-5 mt-5">
          <div class="content">
            <router-view />
          </div>
        </div>
      </template>
      <template v-else>
        <router-view />
      </template>
    </template>
  </template>
  <template v-else-if="data.authChecked">
    <div class="login">
      <p v-if="data.error" class="has-text-danger mb-3">{{ data.error }}</p>
      <button class="button is-link" @click="login">Se connecter avec Coworking Metz</button>
    </div>
  </template>
</template>
<style scoped>
.login {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}
</style>
