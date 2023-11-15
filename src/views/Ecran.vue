<template>
    <!-- <h1 class="title">{{ data.ecran.slug }}</h1> -->
    <div class="editeur">
        <div class="apercu">
            <router-link v-if="data.slide" :to="{ name: 'slide', params: { id: data.slide.id } }">
                <SlidePreview :slide="data.slide" />
            </router-link>
        </div>
        <div class="slides" ref="slidesDiv">
            <ul ref="liste">
                <template v-for="slide in slides" :key="slide.id">
                    <li @dragenter="dragenter" @dragover="dragover" @drop="drop" :id="slide.id">
                        <SlidePreviewImage :slide="slide" :selected="slide.id == data.slide.id" draggable="true"
                            @dragstart="dragstart" @dragend="dragend" />
                    </li>
                </template>
            </ul>
        </div>
    </div>
</template>
<script setup>
import SlidePreview from '@/components/Slides/SlidePreview.vue'
import SlidePreviewImage from '@/components/Slides/SlidePreviewImage.vue'
import { onMounted, reactive, computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useSlidesStore } from '@/stores/slides'
import supabase from "@/supabase";

import { useEcransStore } from '@/stores/ecrans'
import { pageTitle } from '@/utils'


const data = reactive({
    ecran: false,
    slide: false
})
const route = useRoute()
const ecransStore = useEcransStore();
const slidesStore = useSlidesStore();

const slidesDiv = ref(null);
const liste = ref(null);

window.bus.on('choisir-slide', slide => {
    console.log(slide.id)
    data.slide = Object.assign({}, slide);
})
const slides = computed(() => {
    const tmpSlides = slidesStore.slides.filter(filterSlides);
    if (data.ecran.slideSort) {
        const out = [];
        data.ecran.slideSort.forEach(id => {
            tmpSlides.forEach(slide => {
                if (id == slide.id) {
                    out.push(slide);
                }
            })
        })
        return out;
    } else return tmpSlides;
})
function filterSlides(slide) {
    const liens = slidesStore.getLiens(slide.id);
    for (const lien of liens) {
        if (lien.ecran_id == data.ecran.id) {
            return true
        }
    }
}

onMounted(() => {
    const response = ecransStore.getEcran(route.params.id);
    data.ecran = response
    pageTitle('Ecran', data.ecran.name);



});

function dragenter(e) {
    e.preventDefault();
}
function dragover(e) {
    e.preventDefault();
}
function drop(e) {
    e.preventDefault();

    let srcContainer = document.getElementById(e.dataTransfer.getData("text"));
    let srcElement = srcContainer.querySelector("[draggable]");
    let targetContainer = e.target.closest('[id]');
    let targetElement = targetContainer.querySelector("[draggable]");
    document.querySelectorAll('.dragging').forEach(item=>item.classList.remove("dragging"));

    srcContainer.insertAdjacentElement("afterbegin", targetElement);
    targetContainer.insertAdjacentElement("afterbegin", srcElement);
}
function dragstart(e) {
    e.dataTransfer.setData("text", e.target.closest('[id]').id);
    e.target.closest('[draggable]').classList.add("dragging");

}
function dragend(e) {
    const sort = []
    liste.value.querySelectorAll('.slidePreview').forEach(item => sort.push(item.dataset.id))
    console.log(sort);
    data.ecran.slideSort = sort;
    supabase
        .from('ecrans')
        .update({ slideSort: sort })
        .eq('id', data.ecran.id).then(response => {
            console.log(response)
        })

}

</script>
<style>
.dragging {
    opacity: 0.2;
}

.container {
    flex: 1;
    overflow: hidden;
    position: relative;
}

.container>.content {
    width: 100%;
    height: 100%;
    position: absolute;
}

.editeur {
    display: flex;
    gap: 1rem;
    height: 100%;
    background-color: #333;
}

.editeur .apercu {
    flex: 1;
    position: relative;
}

.editeur .apercu .iframe {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 100%;
}

.editeur .slides {
    width: 200px;
    max-height: 100%;
    overflow-y: auto;
}

.editeur .slides>ul {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.editeur .slides>ul,
.editeur .slides>ul>li {
    margin: 0;
    padding: 0;
    list-style: none;
}

.editeur .slides>ul>li {
    display: block;
}

.slides {}
</style>