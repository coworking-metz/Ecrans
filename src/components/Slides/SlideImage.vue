<template>
    <div ref="canvasWrapper"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
const props = defineProps(['slide']);
const canvasWrapper = ref(null);

const img = new Image();
img.crossOrigin = "Anonymous";

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

let sti;
const drawCanvas = () => {
    if (!img.complete) return;
    if(!canvasWrapper.value) return;
    
    canvas.width = canvasWrapper.value.clientWidth;
    canvas.height = canvasWrapper.value.clientHeight;

    ctx.fillStyle = props.slide.meta.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgAspectRatio = img.width / img.height;
    const canvasAspectRatio = canvas.width / canvas.height;

    let renderWidth, renderHeight, xOffset, yOffset;

    if (props.slide.meta.fit === 'cover') {
        if (imgAspectRatio > canvasAspectRatio) {
            renderHeight = canvas.height;
            renderWidth = renderHeight * imgAspectRatio;
            xOffset = -(renderWidth - canvas.width) / 2;
            yOffset = 0;
        } else {
            renderWidth = canvas.width;
            renderHeight = renderWidth / imgAspectRatio;
            xOffset = 0;
            yOffset = -(renderHeight - canvas.height) / 2;
        }
    } else {  // 'contain'
        if (imgAspectRatio > canvasAspectRatio) {
            renderWidth = canvas.width;
            renderHeight = renderWidth / imgAspectRatio;
        } else {
            renderHeight = canvas.height;
            renderWidth = renderHeight * imgAspectRatio;
        }
        xOffset = (canvas.width - renderWidth) / 2;
        yOffset = (canvas.height - renderHeight) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = parseFloat(props.slide.meta.opacity);
    ctx.drawImage(img, xOffset, yOffset, renderWidth, renderHeight);

    clearTimeout(sti);
    sti = setTimeout(() => {
        canvas.toBlob((blob) => {
            window.bus.emit('saveBlob', { blob, slideId: props.slide.id })
        }, 'image/png');
    }, 1000)
};

onMounted(() => {
    canvasWrapper.value.appendChild(canvas);

    img.onload = () => {
        drawCanvas();
    };

    img.src = supabaseMediaUrl(props.slide.meta.image, { w: 1600 });

    window.addEventListener('resize', drawCanvas);
});

onUnmounted(() => {
    window.removeEventListener('resize', drawCanvas);
});

watch(() => props.slide.meta.image, (newImage) => {
    img.src = supabaseMediaUrl(newImage, { w: 1600 });
});

watch(() => props.slide.meta.fit, () => {
    drawCanvas();
});
</script>

<style scoped>
div {
    width: 100%;
    height: 100%;
}
</style>