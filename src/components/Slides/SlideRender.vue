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
import { onMounted } from 'vue';

import SlideImage from '@/components/Slides/SlideImage.vue';
import SlideUrl from '@/components/Slides/SlideUrl.vue';
import SlideDefault from '@/components/Slides/SlideDefault.vue';
const props = defineProps(['slide'])
import supabase, { SUPABASE_URL } from "@/supabase";

window.bus.on('saveBlob', async (params) => {
    console.log('saveBlob')
    const { data, error } = await supabase
        .storage
        .from('apercus')
        .upload(params.slideId + '.png', params.blob, { upsert: true });
        console.log(data)

})
</script>