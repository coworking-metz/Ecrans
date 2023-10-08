
<script setup>
import Logo from '@/components/Logo.vue';
import { reactive } from 'vue';

const data = reactive({
    ouvert: false
})
function toggleNavBar() {
    data.ouvert = !data.ouvert;
}

</script>
<template>
    <nav class="navbar is-light">
        <div class="navbar-brand">
            <router-link class="navbar-item" to="/">
                <Logo width="30" height="30" />
            </router-link>
            <button role="button" @click="toggleNavBar()" class="navbar-burger" aria-label="menu" aria-expanded="false"
                data-target="navbarMenu" :class="{ 'is-active': data.ouvert }">
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
                <span aria-hidden="true"></span>
            </button>
        </div>

        <div class="navbar-menu" :class="{ 'is-active': data.ouvert }">
            <div class="navbar-start">
                <router-link class="navbar-item" to="/" exact-active-class="is-active">
                    Ecrans
                </router-link>
                <router-link class="navbar-item" to="/slides" exact-active-class="is-active">
                    Slides
                </router-link>
                <router-link class="navbar-item" to="/medias" exact-active-class="is-active">
                    Medias
                </router-link>
            </div>
        </div>
    </nav>
</template>