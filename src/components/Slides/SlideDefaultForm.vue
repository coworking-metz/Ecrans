<template>
    <div class="field">
        <label class="label">Image principale</label>

        <template v-if="data.meta.imagePrincipale">
            <div class="apercu">
                <img :src="imageThumbnail(data.meta.imagePrincipale)">
            </div>
        </template>

        <p class="help">Cette image sera affichée de manière centrée, au dessus du texte</p>

        <MediaSelector name="imagePrincipale" />
    </div>

</template>
<script setup>
import MediaSelector from '@/components/Medias/MediaSelector.vue'
import { reactive, defineProps, onMounted, computed } from 'vue'
import { useMediasStore } from '@/stores/medias'
const mediasStore = useMediasStore();
const props = defineProps(['slide'])

const data = reactive({ meta: { image: '' } });

window.bus.on(`updateMedia`, (params) => {
    const media = mediasStore.fetchMedia(params.id);
    console.log(params)
    data.meta[params.name] = media.url
    setSlideMeta()
});

function imageThumbnail(image) {
    return image.replace('medias/medias/', 'medias/thumbnails/')
}
onMounted(() => {
    data.meta.imagePrincipale = props.slide?.meta?.imagePrincipale || ''
    data.meta.image = props.slide?.meta?.image || ''
    data.meta.fit = props.slide?.meta?.fit || 'cover'
    data.meta.backgroundColor = props.slide?.meta?.backgroundColor || '#000000'
})

function setSlideMeta() {
    console.log(data.meta)
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