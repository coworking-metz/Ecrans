<template>
    <article class="media mb-2" :draggable="!!ecranId" @dragstart="dragstart" @dragenter="dragenter" @dragover="dragover"
        @drop="drop" :id="slide.id">
        <!-- <figure class="media-left">
            <p class="image is-64x64">
                <img src="https://bulma.io/images/placeholders/128x128.png">
            </p>
        </figure> -->
        <div class="media-content">
            <nav class="level is-mobile">
                <div class="level-left">
                    <div class="level-item grabbable" v-if="ecranId">
                        <span class="icon is-small"><i class="fas fa-sort"></i></span>
                    </div>

                    <router-link :to="{ name: 'slide', params: { id: slide.id } }">{{ slide.name
                        }}</router-link>&nbsp;<small class="tag">{{ type }}</small>&nbsp;<strong>{{ slide.duration }}
                        secondes</strong>&nbsp;
                    <small>{{ formatDateToFrench(slide.created_at) }}</small>
                </div>
                <div class="level-right">
                    <div class="level-item">
                        <router-link :to="{ name: 'ecran-slides', params: { id: ecran.id } }" v-for="ecran in ecrans"
                            class="tag is-primary is-light mr-2">{{ ecran.name }}</router-link>
                    </div>
                    <router-link :to="{ name: 'slide', params: { id: slide.id } }" class="level-item"
                        v-if="!slide.trash">
                        <span class="icon is-small"><i class="fas fa-pen"></i></span>
                    </router-link>
                    <router-link :to="{ name: 'visionner-slide', params: { id: slide.id } }" class="level-item"
                        v-if="!slide.trash" title="Aperçu de ce slide" target="_blank">
                        <span class="icon is-small"><i class="fas fa-tv"></i></span>
                    </router-link>
                    <a class="level-item" @click="deleteSlide" v-if="!slide.trash" title="Mettre ce slide dans la corbeille">
                        <span class="icon is-small"><i class="fas fa-trash"></i></span>
                    </a>
                    <a class="level-item" @click="recoverSlide" v-else="!slide.trash" title="Restaurer ce slide">
                        <span class="icon is-small"><i class="fas fa-recycle"></i></span>
                    </a>
                </div>
            </nav>
        </div>
    </article>
</template>
<script setup>
import { formatDateToFrench } from '@/utils'
import { useSlidesStore } from '@/stores/slides'
const slidesStore = useSlidesStore();

import { computed, ref, watchEffect } from 'vue';
import supabase from "@/supabase";

const props = defineProps(['slide','ecranId'])


const ecrans = ref([]);


watchEffect(async () => {
    ecrans.value = await slidesStore.getEcrans(props.slide.id);
});

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





function dragstart(e) {
    if(!props.ecranId) return;
    console.log('dragstart', e.target, props.slide.id)
    e.dataTransfer.setData("text", props.slide.id);
}
function dragenter(e) {
    if(!props.ecranId) return;
    e.preventDefault();
}
function dragover(e) {
    if(!props.ecranId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}
function drop(e) {
    if(!props.ecranId) return;
    e.preventDefault();

    let srcId = e.dataTransfer.getData("text")
    let targetId = e.target.closest('[id]').id;

    console.log({ srcId, targetId }, e.target.closest('[id]'))


    window.bus.emit('update-sort',{srcId, targetId});

}

</script>