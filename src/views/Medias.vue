<template>
    <h1 class="title">Liste des fichiers media</h1>
    <MediaUpload />

    <MediaSearch/>

    <div class="mt-5">
        <template v-for="media in medias">
            <MediaItem :media="media" :edit="true"/>
        </template>
    </div>
</template>
<script setup>
import { useMediasStore } from '@/stores/medias'
import MediaUpload from '@/components/Medias/MediaUpload.vue'
import MediaItem from '@/components/Medias/MediaItem.vue'
import MediaSearch from '@/components/Medias/MediaSearch.vue'
import { onMounted, computed, reactive } from 'vue';

const data = reactive({
    search: ''
})
const mediasStore = useMediasStore();

const medias = computed(() => {
    return mediasStore.medias.filter(media => {
        if (data.search) {
            return media.index.includes(data.search)
        } else {
            return true;
        }
    })
})
window.bus.on('searchMedia', search => data.search = search)
</script>

<style scoped>
.column {
    flex: 0 0 150px;
}
</style>