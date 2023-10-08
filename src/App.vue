<script setup>
import NavBar from '@/components/NavBar.vue';

</script>

<template>
  <nav-bar/>
  <div class="container mt-6">
    <div class="content">
      <router-view />
    </div>
  </div>
</template>

<style scoped></style>
