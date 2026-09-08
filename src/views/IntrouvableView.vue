<script setup>
import { useRoute } from "vue-router";

const route = useRoute();
</script>

<template>
  <div class="notification is-warning">
    <p><strong>Page introuvable</strong></p>
    <p>{{ route.fullPath }}</p>
    <RouterLink class="button is-small mt-3" to="/">Retour aux écrans</RouterLink>
  </div>
</template>
