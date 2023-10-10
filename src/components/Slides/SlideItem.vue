<template>
    <article class="media mb-2">
        <!-- <figure class="media-left">
            <p class="image is-64x64">
                <img src="https://bulma.io/images/placeholders/128x128.png">
            </p>
        </figure> -->
        <div class="media-content">
            <nav class="level is-mobile">
                <div class="level-left">
                    <router-link :to="{ name: 'slide', params: { id: slide.id } }" >{{ slide.name }}</router-link>&nbsp;<small class="tag">{{ type }}</small>&nbsp;<strong>{{
                        slide.duration }} secondes</strong>&nbsp;
                    <small>{{ formatDateToFrench(slide.created_at) }}</small>
                </div>
                <div class="level-right">
                    <router-link :to="{ name: 'slide', params: { id: slide.id } }" class="level-item" v-if="!slide.trash">
                        <span class="icon is-small"><i class="fas fa-pen"></i></span>
                    </router-link>
                    <a class="level-item" v-if="!slide.trash">
                        <span class="icon is-small"><i class="fas fa-tv"></i></span>
                    </a>
                    <a class="level-item" @click="deleteSlide" v-if="!slide.trash">
                        <span class="icon is-small"><i class="fas fa-trash"></i></span>
                    </a>
                    <a class="level-item" @click="recoverSlide" v-else="!slide.trash">
                        <span class="icon is-small"><i class="fas fa-recycle"></i></span>
                    </a>
                </div>
            </nav>
        </div>
    </article>
</template>
<script setup>
import { formatDateToFrench } from '@/utils'

import { computed } from 'vue';
import supabase from "@/supabase";

const props = defineProps(['slide'])

const type = computed(() => {
    if (!props.slide.type) return '';
    return props.slide.type;
})

async function deleteSlide() {
    if (!confirm(`Effacer le slide "${props.slide.name}" ?`)) return;

    const { data, error } = await supabase
        .from('slides')
        .update({ trash: true })
        .eq('id', props.slide.id);

    window.bus.emit('loadSlides');
}
async function recoverSlide() {
    const { data, error } = await supabase
        .from('slides')
        .update({ trash: false })
        .eq('id', props.slide.id);

    window.bus.emit('loadSlides');
}
</script>