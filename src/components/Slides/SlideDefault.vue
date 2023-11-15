<template>
    <div ref="canvasWrapper" :style="'background:' + props.slide.meta.backgroundColor"></div>
</template>
  
<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
const props = defineProps(['slide']);
const canvasWrapper = ref(null);

const image = new Image();
image.crossOrigin = "Anonymous";
const imagePrincipale = new Image();
imagePrincipale.crossOrigin = "Anonymous";
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// Charger la police personnalisée
new FontFace('EvelethClean', 'url(/fonts/evelethclean-webfont.woff)').load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    drawCanvas();  // Redessiner le canevas une fois que la police est chargée
});
new FontFace('EvelethCleanThin', 'url(/fonts/evelethcleanthin-webfont.woff)').load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    drawCanvas();  // Redessiner le canevas une fois que la police est chargée
});

let sti = false;
const drawCanvas = () => {
    if (!image.complete) return;

    canvas.width = canvasWrapper.value.clientWidth;
    canvas.height = canvasWrapper.value.clientHeight;

    const imgAspectRatio = image.width / image.height;
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
    // ctx.globalCompositeOperation = 'destination-over';
    // ctx.globalAlpha = parseFloat(props.slide.meta.opacity);
    ctx.drawImage(image, xOffset, yOffset, renderWidth, renderHeight);

    ctx.globalAlpha = 1 - parseFloat(props.slide.meta.opacity);
    ctx.fillStyle = props.slide.meta.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1.0;


    const topAreaHeight = canvas.height * 0.4;
    const bottomAreaHeight = canvas.height - topAreaHeight;
    const bottomAreaTop = topAreaHeight;

    const imgPrincipalAspect = imagePrincipale.width / imagePrincipale.height;
    const targetHeight = topAreaHeight * 0.8;
    const targetWidth = targetHeight * imgPrincipalAspect;

    xOffset = (canvas.width - targetWidth) / 2;
    yOffset = (topAreaHeight - targetHeight) / 2;

    ctx.drawImage(imagePrincipale, xOffset, yOffset, targetWidth, targetHeight);

    const maxTextWidth = renderWidth * 0.3;
    let fontSize = targetHeight * 0.15;

    // Paramètres pour le texte
    ctx.font = `${fontSize}px EvelethClean`;
    ctx.fillStyle = props.slide.meta.color;  // Ou toute autre couleur
    ctx.textAlign = 'center';
    let lines = getLines(ctx, props.slide.meta.titre, maxTextWidth);

    // Calculer la position de départ pour le texte
    let lineHeight = fontSize * 1.2;
    let textX = canvas.width / 2;
    let textYStart = bottomAreaTop + canvas.height * 0.1;

    // Dessiner chaque ligne de texte
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textX, textYStart + (i * lineHeight));
    }
    let hauteurTitre = textYStart + (lines.length * lineHeight);

    fontSize = targetHeight * 0.12;
    ctx.font = `${fontSize}px EvelethCleanThin`;
    ctx.textAlign = 'center';
    lines = getLines(ctx, props.slide.meta.texte, maxTextWidth);

    // Calculer la position de départ pour le texte
    lineHeight = fontSize * 1.2;
    textX = canvas.width / 2;
    textYStart = hauteurTitre;

    // Dessiner chaque ligne de texte
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textX, textYStart + (i * lineHeight));
    }

    clearTimeout(sti);

    sti = setTimeout(() => {

        canvas.toBlob((blob) => {
            window.bus.emit('saveBlob', { blob, slideId: props.slide.id })
        }, 'image/png');
    }, 1000)

};

onMounted(() => {
    canvasWrapper.value.appendChild(canvas);

    image.onload = drawCanvas;
    image.src = props.slide.meta.image;

    imagePrincipale.onload = drawCanvas;
    imagePrincipale.src = props.slide.meta.imagePrincipale;

    window.addEventListener('resize', drawCanvas);
});

onUnmounted(() => {
    window.removeEventListener('resize', drawCanvas);
});

watch(() => props.slide.meta.image, (newImage) => {
    image.src = newImage;
});

watch(() => props.slide.meta.imagePrincipale, (newImage) => {
    imagePrincipale.src = newImage;
});

watch(() => props.slide.meta.fit, () => {
    drawCanvas();
});


// Obtient un tableau de lignes à partir du texte donné, en gérant les sauts de ligne
const getLines = (ctx, text, maxWidth) => {
    const paragraphs = text.split('\n');
    let lines = [];

    paragraphs.forEach(paragraph => {
        const words = paragraph.split(' ');
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = ctx.measureText(`${currentLine} ${word}`).width;
            if (width < maxWidth) {
                currentLine += ` ${word}`;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine);
    });

    return lines;
};
</script>
  
<style scoped>
div {
    width: 100%;
    height: 100%;
}
</style>
  