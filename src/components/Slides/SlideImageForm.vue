<template>
    <div class="field">
        <label class="label">Image de fond</label>
        <template v-if="data.meta.image">
            <div class="apercu">
                <img :src="imageThumbnail">
            </div>
        </template>

        <MediaSelector name="image" />
    </div>
    <template v-if="data.meta.image">
        <div class="columns">
            <div class="column">
                <div class="field">
                    <label class="label">Ajustement</label>
                    <div class="control">
                        <div class="select">
                            <select @change="setSlideMeta" v-model="data.meta.fit">
                                <option value="cover">cover</option>
                                <option value="contain">contain</option>
                            </select>
                        </div>
                    </div>
                </div>

            </div>
            <div class="column">
                <div class="field">
                    <label class="label">Opacité</label>
                    <div class="control">
                        <input class="slider" type="range" step="0.01" min="0" max="1" v-model="data.meta.opacity">
                    </div>
                </div>

            </div>
            <div class="column">
                <div class="field" v-if="data.meta.fit == 'contain' || data.meta.opacity != 1">
                    <label class="label">Couleur de fond</label>
                    <div class="control">
                        <input type="color" class="input" @input="setSlideMeta" v-model="data.meta.backgroundColor">
                        <input type="text" class="input" @input="setSlideMeta" v-model="data.meta.backgroundColor">
                    </div>
                </div>
            </div>
        </div>
    </template>
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


const imageThumbnail = computed(() => {
    return data.meta.image.replace('medias/medias/', 'medias/thumbnails/')
})
onMounted(() => {
    data.meta.opacity = props.slide?.meta?.opacity || 1
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