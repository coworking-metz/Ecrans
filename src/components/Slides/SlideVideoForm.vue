<template>
    <div class="field">
        <label class="label">Video</label>
        <template v-if="data.meta.video">
            <div class="apercu" :data-mp4="mp4" :data-webm="webm">
                <video v-if="data.videoReady" controls width="250">
                    <source :src="mp4" type="video/mp4">
                    <source :src="webm" type="video/webm">
                </video>
            </div>
        </template>

        <MediaSelector name="video" />
    </div>

</template>
<script setup>
import MediaSelector from '@/components/Medias/MediaSelector.vue'
import { reactive, defineProps, onMounted, computed } from 'vue'
import { useMediasStore } from '@/stores/medias'
const mediasStore = useMediasStore();
const props = defineProps(['slide'])

const data = reactive({ meta: { image: '' }, videoReady: false, videosLoaded: 0 });

window.bus.on(`updateMedia`, (params) => {
    const media = mediasStore.fetchMedia(params.id);
    console.log(params)
    data.meta[params.name] = media.url
    setSlideMeta()
});

const mp4 = computed(() => videoUrl('mp4'))
const webm = computed(() => videoUrl('webm'))

function videoUrl(format) {
    const url = 'https://tools.sopress.dev/convertVideo/?t=4&to=' + format + '&v=' + data.meta.video
    clearCacheForUrl(url);
    return url;
}
function clearCacheForUrl(url) {
    fetch(url, {
        cache: 'reload',
    }).then(response => {
        data.videosLoaded++;
        if (data.videosLoaded == 2) {
            data.videoReady = true;
        }
        console.log('Cache cleared and data fetched:', response);
    });
}

onMounted(() => {
    data.meta.video = props.slide?.meta?.video || ''
})

function setSlideMeta() {
    window.bus.emit('setSlideMeta', data.meta)
}
</script>
<style scoped>
.apercu {
    border: 1px dashed #ccc;
    width: 200px;
    height: 200px;
    object-fit: contain;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>