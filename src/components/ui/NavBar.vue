<script setup>
import { utilisateur, logout } from "@/core/auth.js";

const user = utilisateur();
</script>

<template>
  <nav class="navbar is-light" role="navigation">
    <div class="navbar-brand">
      <RouterLink class="navbar-item" to="/">
        <img src="/logo.svg" alt="" width="28" height="28" />
      </RouterLink>
      <RouterLink class="navbar-item" to="/">Écrans</RouterLink>
      <RouterLink class="navbar-item" to="/slides">Slides</RouterLink>
      <RouterLink class="navbar-item" to="/medias">Médias</RouterLink>
    </div>
    <div v-if="user" class="navbar-end">
      <div class="navbar-item utilisateur">
        <figure v-if="user.avatar" class="image is-32x32 mr-2">
          <img class="is-rounded" :src="user.avatar" alt="" referrerpolicy="no-referrer" />
        </figure>
        <span>{{ user.name }}</span>
        <a class="ml-3 is-size-7" href="#" @click.prevent="logout">Déconnexion</a>
      </div>
    </div>
  </nav>
</template>
