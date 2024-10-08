<script setup>
import { computed, onMounted, watch, reactive, ref } from 'vue';
import NavBar from '@/components/NavBar.vue';
import { useRoute } from 'vue-router';
import { useEcransStore } from '@/stores/ecrans';
import { useMediasStore } from '@/stores/medias';
import { useSlidesStore } from '@/stores/slides';

const route = useRoute();
const ecransStore = useEcransStore();
const mediasStore = useMediasStore();
const slidesStore = useSlidesStore();

const data = reactive({
  hasNavbar: false,
  password: ''
});

function start() {
  ecransStore.fetchEcrans();
  slidesStore.fetchLiens();
  slidesStore.fetchSlides();
  mediasStore.fetchMedias();

  data.hasNavbar = !route?.name?.includes('visionner');

};

const isAuthenticated = computed(() => {
  if(document.location.href.includes('visionner')) return true;
  const envPassword = import.meta.env.VITE_APP_PASSWORD || "1337";
  const storedPassword = localStorage.getItem('auth');
  if (storedPassword === envPassword) {
    return true;
  }
  if (data.password === envPassword) {
    localStorage.setItem('auth', data.password);
    return true;
  }
})
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
  <template v-if="appReady">
    <template v-if="isAuthenticated">
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
    <template v-else>
      <form class="login">
        <input type="password" v-model="data.password" placeholder="Enter password" />
        <!-- <button type="submit">Submit</button> -->
      </form>
    </template>
  </template>
</template>
<style scoped>
.login {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
</style>