<template>
    <hr>
    <article class="media" @click="selectMedia" :class="{ 'is-selected': props.selected, 'is-selectable': !props.edit }">
        <figure class="media-left">
            <p class="image">
                <a :href="media.url" target="_blank"><img :src="mediaThumbnail" :alt="media.file.name"></a>
            </p>
        </figure>
        <div class="media-content">
            <div class="content">
                <p>
                    <strong :title="media.file.name" class="media-name">{{ shortenFileName(media.file.name) }}</strong>
                    &nbsp; <small>{{ formatDateToFrench(media.file.metadata.lastModified) }}</small>
                </p>
            </div>
            <nav class="level is-mobile" v-if="props.edit">
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
import { computed } from 'vue';
import { shortenFileName, formatDateToFrench } from '@/utils'
const props = defineProps(['media', 'edit', 'selected', 'name'])
import supabase from "@/supabase";

const mediaThumbnail = computed(() => {
    return supabaseMediaUrl(props.media.thumbnail)    
})
async function deleteMedia() {
    if (!confirm(`Effacer le fichier ${props.media.file.name} ? `)) return;
    const { error } = await supabase.storage.from('medias').remove([`medias/${props.media.file.name}`, `thumbnails/${props.media.file.name}`]);
    window.bus.emit('loadMedias')
}

function selectMedia() {
    const params = { id: props.media.file.id };
    if (props.name) {
        params.name = props.name;
    }
    window.bus.emit('selectMedia', params)
}
</script>
<style scoped>
.is-selectable {
    cursor: pointer;
}

.is-selectable:hover .media-name {
    text-decoration: underline;
}

figure {
    margin-bottom: 0 !important
}


.is-selectable .media-name:before {
    content: '✅';
    display: inline-block;
    filter: grayscale(100%);
    margin-right: 1em;
}

.is-selectable.is-selected .media-name:before {
    filter: none;
}

.image img {
    display: block;
    width: 64px;
    height: 64px;
    object-fit: cover;
}
</style>
