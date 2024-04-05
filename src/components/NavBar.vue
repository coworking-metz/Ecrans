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
            <router-link class="navbar-item" to="/">
                Ecrans
            </router-link>
            <router-link class="navbar-item" to="/slides">
                Slides
            </router-link>
            <router-link class="navbar-item" to="/medias">
                Medias
            </router-link>
        </div>

    </nav>
</template>