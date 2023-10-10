<template>
    <template v-if="slide.type == 'image'">
        <SlideImage :slide="slide" />
    </template>
    <template v-if="slide.type == 'url'">
        <SlideUrl :slide="slide" />
    </template>
    <template v-if="slide.type == 'default'">
        <SlideDefault :slide="slide" />
    </template>
</template>
<script setup>
import SlideImage from '@/components/Slides/SlideImage.vue';
import SlideUrl from '@/components/Slides/SlideUrl.vue';
import SlideDefault from '@/components/Slides/SlideDefault.vue';
const props = defineProps(['slide'])

</script>