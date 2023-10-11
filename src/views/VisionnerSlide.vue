<template>
    <div class="visionner" ref="visionner" v-if="data.slide">
        <div class="slides">

            <div class="slide">
                <SlideRender :slide="data.slide" />
            </div>

        </div>
    </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import { useEcransStore } from '@/stores/ecrans'
import { useSlidesStore } from '@/stores/slides'
import { pageTitle } from '@/utils'
import SlideRender from '@/components/Slides/SlideRender.vue';
import supabase, { SUPABASE_URL } from "@/supabase";
import html2canvas from 'html2canvas';

const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();
const visionner = ref(null);

const data = reactive({
    slide: false,
})

onMounted(async () => {
    const response = await slidesStore.fetchSlide(route.params.id)
    data.slide = response[0];


    // setTimeout(() => {

    //     const element = visionner.value;
    //     const slideId = data.slide.id;
    //     html2canvas(element).then(canvas => {
    //         document.body.appendChild(canvas);
    //         canvas.toBlob(async (blob) => {
    //             const { data, error } = await supabase.storage.from('apercus').upload(slideId + '.png', blob, { upsert: true });
    //             console.log(SUPABASE_URL + '/storage/v1/object/public/apercus/' + data.path);
    //         });
    //         // const imgData = canvas.toDataURL('image/png');
    //     });

    // }, 2000)
});



</script>
<style scoped></style>