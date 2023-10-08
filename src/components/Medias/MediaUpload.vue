<template>
    <form ref="form" @submit.prevent="mediaUpload" enctype="multipart/form-data">
        <div class="file">
            <label class="file-label">
                <input class="file-input" type="file" multiple="true" ref="mediaFile" @input="mediaUpload">
                <span class="file-cta">
                    <span class="file-icon">
                        <i class="fas fa-upload"></i>
                    </span>
                    <span class="file-label">
                        Ajouter une ou plusieurs images
                    </span>
                </span>
            </label>
        </div>
    </form>
</template>
<script setup>
import supabase from "@/supabase";
import { ref, onMounted } from 'vue'
const validImageTypes = ['image/webp', 'image/svg+xml', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'];
const thumbnailsImageTypes = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'];
const form = ref(null);
const mediaFile = ref(null);
function formSubmit() {

    form.value.submit();
}
async function mediaUpload() {
    for (const file of mediaFile.value.files) {
        if (!validImageTypes.includes(file.type)) {
            return alert(`Format de fichier non autorisé pour ${file.name}`);
        }
        const { data, error } = await supabase.storage
            .from('medias')
            .upload(`medias/${file.name}`, file)

        if (thumbnailsImageTypes.includes(file.type)) {
            uploadThumbnail(file);
        }
        window.bus.emit('loadMedias')
    }
}
function uploadThumbnail(file, width = 150) {
    const image = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
        image.src = e.target.result;
    };

    image.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Maintenir le ratio d'aspect
        const scaleFactor = width / image.width;
        canvas.width = width;
        canvas.height = image.height * scaleFactor;

        // Dessiner l'image redimensionnée
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        // Convertir le canevas en fichier et faire l'upload
        canvas.toBlob(async (blob) => {
            const resizedFile = new File([blob], file.name, { type: blob.type });

            const { data, error } = await supabase.storage
                .from('medias')
                .upload(`thumbnails/${file.name}`, resizedFile)

        }, file.type);
    };

    reader.readAsDataURL(file);
}
</script>