<script setup>
import { computed } from 'vue'
import NavBar from '@/components/NavBar.vue';
import { useRoute } from 'vue-router'
const route = useRoute()

const hasNavbar = computed(() => {
  if (route.name == 'visionner') return false;

  return true;
})
</script>

<template>
  <template v-if="hasNavbar">
    <nav-bar />
    <div class="container">
      <div class="content">
        <div class="section">
          <router-view />
        </div>
      </div>
    </div>
  </template>
  <template v-else>
    <router-view />
  </template>
</template>

<style scoped></style>
