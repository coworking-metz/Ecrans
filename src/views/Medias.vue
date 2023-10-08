<template>
    <h1 class="title">Liste des fichiers media</h1>
    <MediaUpload />

    <div class="field mt-5">
        <p class="control has-icons-right is-expanded">
            <input v-model="data.search" class="input" type="text" placeholder="Trouver un fichier media">
            <span class="icon is-small is-right">
                <i class="fas fa-search"></i>
            </span>
        </p>
    </div>

    <div class="mt-5">
        <template v-for="media in medias">
            <MediaItem :media="media" />
        </template>
    </div>
</template>
<script setup>
import { useMediasStore } from '@/stores/medias'
import MediaUpload from '@/components/Medias/MediaUpload.vue'
import MediaItem from '@/components/Medias/MediaItem.vue'
import { onMounted, computed, reactive } from 'vue';

const data = reactive({
    search: ''
})
const mediasStore = useMediasStore();
const start = () => {
    mediasStore.fetchMedias();
}

const medias = computed(() => {
    return mediasStore.medias.filter(media => {
        if (data.search) {
            return media.index.includes(data.search)
        } else {
            return true;
        }
    })
})
window.bus.on('loadMedias', start)
onMounted(start)
</script>
<style scoped>
.column {
    flex: 0 0 150px;
}
</style>