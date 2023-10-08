<template>
    <hr>
    <article class="media">
        <figure class="media-left">
            <p class="image is-64x64">
                <img :src="media.thumbnail" :alt="media.file.name">
            </p>
        </figure>
        <div class="media-content">
            <div class="content">
                <p>
                    <strong :title="media.file.name">{{ shortenFileName(media.file.name) }}</strong>
                    &nbsp; <small>{{ formatDateToFrench(media.file.metadata.lastModified) }}</small>
                </p>
            </div>
            <nav class="level is-mobile">
                <div class="level-left">
                    <a class="level-item" @click="deleteMedia">
                        <span class="icon is-small"><i class="fas fa-trash"></i></span>
                    </a>
                    <a class="level-item" :href="media.url" target="_blank">
                        <span class="icon is-small"><i class="fas fa-eye"></i></span>
                    </a>
                </div>
            </nav>
        </div>
        <div class="media-right">
        </div>
    </article>
</template>
<script setup>
import { shortenFileName, formatDateToFrench } from '@/utils'
const props = defineProps(['media'])
import supabase from "@/supabase";

async function deleteMedia() {
    if (!confirm(`Effacer le fichier ${props.media.file.name} ? `)) return;
    const { error } = await supabase.storage.from('medias').remove([`medias/${props.media.file.name}`, `thumbnails/${props.media.file.name}`]);
    window.bus.emit('loadMedias')
}
</script>
<style scoped>
figure {
    margin-bottom: 0 !important
}
</style>
