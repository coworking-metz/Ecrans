<template>
    <router-link :to="{ name: 'slide', params: { id: slide.id } }" class="box mb-2">
        {{ slide.name }} - {{ slide.type }} 
    </router-link>
</template>
<script setup>
const props = defineProps(['slide'])
</script>