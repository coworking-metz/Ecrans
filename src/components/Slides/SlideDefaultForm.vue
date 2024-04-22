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
        <div class="columns">
            <div class="column">
                <div class="field">
                    <label class="label">Titre</label>
                    <div class="control">
                        <input class="input" type="text" v-model="data.meta.titre" @input="setSlideMeta">
                    </div>
                    <p class="help"></p>
                </div>

                <div class="field">
                    <label class="label">Texte</label>
                    <div class="control">
                        <!-- <textarea class="textarea is-small" @input="setSlideMeta" v-model="data.meta.texte"></textarea> -->
                        <div ref="editor"></div>
                    </div>
                </div>

            </div>
            <div class="column is-one-third">
                <div class="field">
                    <label class="label">Couleur du texte</label>
                    <div class="control">
                        <input type="color" class="input" @input="setSlideMeta" v-model="data.meta.color">
                        <input type="text" class="input" @input="setSlideMeta" v-model="data.meta.color">
                    </div>
                </div>
            </div>
        </div>
        <div class="field">
            <label class="label">Url à afficher en QR code</label>
            <div class="control">
                <input class="input" type="url" v-model="data.meta.url" @input="setSlideMeta">
            </div>
            <p class="help"></p>
        </div>
    </div>
</template>
<script setup>
import MediaSelector from '@/components/Medias/MediaSelector.vue'
import { reactive, defineProps, onMounted, computed, ref } from 'vue'
import { useMediasStore } from '@/stores/medias'
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

const mediasStore = useMediasStore();
const props = defineProps(['slide'])
const editor = ref(null);
const data = reactive({ meta: { image: '' } });
let quillInstance;

const toolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    // ['blockquote', 'code-block'],
    // ['link', 'image', 'video', 'formula'],

    [{ 'header': 1 }, { 'header': 2 }],
    // [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
    // [{ 'script': 'sub' }, { 'script': 'super' }],
    // [{ 'indent': '-1' }, { 'indent': '+1' }],
    // [{ 'direction': 'rtl' }],

    [{ 'size': ['small', false, 'large', 'huge'] }],
    // [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    [{ 'align': [] }],

    ['clean']
];



window.bus.on(`updateMedia`, (params) => {
    const media = mediasStore.fetchMedia(params.id);
    console.log(params)
    data.meta[params.name] = media.url
    setSlideMeta()
});

function imageThumbnail(image) {
    return supabaseMediaUrl(image.replace('medias/medias/', 'medias/thumbnails/'))
}
onMounted(() => {

    data.meta.color = props.slide?.meta?.color || '#FFFFFF'
    data.meta.texte = props.slide?.meta?.texte || ''
    data.meta.titre = props.slide?.meta?.titre || ''
    data.meta.imagePrincipale = props.slide?.meta?.imagePrincipale || ''
    data.meta.image = props.slide?.meta?.image || ''
    data.meta.fit = props.slide?.meta?.fit || 'cover'
    data.meta.url = props.slide?.meta?.url || ''
    data.meta.backgroundColor = props.slide?.meta?.backgroundColor || '#000000'

    quillInstance = new Quill(editor.value, {
        theme: 'snow',
        modules: { toolbar: toolbarOptions }
    });
    quillInstance.root.innerHTML = data.meta.texte;
    quillInstance.on('text-change', () => {
        data.meta.texte = quillInstance.root.innerHTML;
        setSlideMeta()
    });

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

.text-preview blockquote {
    white-space: preserve;
}
</style>