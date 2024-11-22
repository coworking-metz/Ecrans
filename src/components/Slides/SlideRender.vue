<template>
    <template v-if="slide.type == 'image'">
        <SlideImage :slide="slide" />
    </template>
    <template v-if="slide.type == 'video'">
        <SlideVideo :slide="slide" />
    </template>
    <template v-if="slide.type == 'url'">
        <SlideUrl :slide="slide" />
    </template>
    <template v-if="slide.type == 'default'">
        <SlideDefault :slide="slide" />
    </template>
    <SlideDuration :duration="slide.duration"></SlideDuration>
</template>
<script setup>
import { onMounted } from 'vue';

import SlideDuration from '@/components/Slides/SlideDuration.vue';
import SlideImage from '@/components/Slides/SlideImage.vue';
import SlideVideo from '@/components/Slides/SlideVideo.vue';
import SlideUrl from '@/components/Slides/SlideUrl.vue';
import SlideDefault from '@/components/Slides/SlideDefault.vue';
const props = defineProps(['slide', 'render'])
import supabase, { SUPABASE_URL } from "@/supabase";
import { useRoute } from 'vue-router';
const route = useRoute();

if (route.query.render) {
    console.log('render');
    window.bus.on('saveBlob', async (params) => {
        console.log('saveBlob')
        const { data, error } = await supabase
            .storage
            .from('apercus')
            .upload(params.slideId + '.png', params.blob, { upsert: true });
        console.log(data)

    })
}
</script>