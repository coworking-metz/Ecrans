<template>
    <div class="box mb-5">
        <template v-if="data.closed">
            <button type="button" class="button" @click="data.closed = false">
                <span class="icon">
                    <i class="fa fa-image"></i>
                </span>
                <span>Choisr un fichier media</span>
            </button>

        </template>
        <template v-else>
            <label class="label">Sélectionner unne image</label>
            <div class="control">
                <MediaUpload :name="props.name"/>

                <MediaSearch />

                <div class="medias-scroll">
                    <template v-for="media in medias">
                        <MediaItem :media="media" :selected="data.selected == media.file.id" :name="props.name" />
                    </template>
                </div>
            </div>
        </template>
    </div>
</template>
<script setup>
import { useMediasStore } from '@/stores/medias'
import MediaUpload from '@/components/Medias/MediaUpload.vue'
import MediaItem from '@/components/Medias/MediaItem.vue'
import MediaSearch from '@/components/Medias/MediaSearch.vue'
import { onMounted, computed, reactive } from 'vue';

const props = defineProps(['name'])

const data = reactive({
    closed: true,
    search: '',
    selected: false
})
const mediasStore = useMediasStore();


window.bus.on('closeMediaSelector', () => {
    data.closed = true
})

window.bus.on('searchMedia', search => data.search = search)
window.bus.on('selectMedia', selectMedia)

function selectMedia(params) {
    if (params.name && params.name != props.name) return;
    data.selected = params.id;
    window.bus.emit('updateMedia', params);
    data.closed = true;
}

const medias = computed(() => {
    return mediasStore.medias.filter(media => {
        if (data.search) {
            return media.index.includes(data.search)
        } else {
            return true;
        }
        // }).sort((a, b) => {
        //     if (a.file.id === data.selected) return -1;
        //     if (b.file.id === data.selected) return 1;
        //     return 0;
    });
})
onMounted(() => {
    mediasStore.fetchMedias();
})
</script>
<style scoped>
.column {
    flex: 0 0 150px;
}

.medias-scroll {
    overscroll-behavior: none;
    max-height: 50vh;
    overflow-y: auto;
}
</style>