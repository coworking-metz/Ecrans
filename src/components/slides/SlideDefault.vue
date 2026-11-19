<script setup>
import { computed } from "vue";
import { urlImage, urlQrCode } from "@/core/media.js";

const props = defineProps({
  slide: { type: Object, required: true },
  largeurImage: { type: Number, default: 1600 },
});

const meta = computed(() => props.slide.meta || {});

const fond = computed(() =>
  meta.value.image ? urlImage(meta.value.image, { w: props.largeurImage, t: props.slide.updated_at }) : ""
);

const imagePrincipale = computed(() =>
  meta.value.imagePrincipale ? urlImage(meta.value.imagePrincipale, { w: 500 }) : ""
);

const qr = computed(() => (meta.value.url ? urlQrCode(meta.value.url) : ""));

// Le texte est du HTML produit par l'éditeur, saisi par un administrateur
// identifié : il est rendu tel quel, comme depuis l'origine.
const texte = computed(() => (meta.value.texte || "").replaceAll("\n", "<br>"));
</script>

<template>
  <div class="rendu rendu-default" :style="{ background: meta.backgroundColor || '#000000' }">
    <img
      v-if="fond"
      class="rendu-fond"
      :src="fond"
      alt=""
      :style="{ objectFit: meta.fit || 'cover', opacity: meta.opacity ?? 1 }"
    />

    <div class="rendu-contenu">
      <div v-if="meta.emojiPrincipal" class="rendu-figure rendu-emoji">
        {{ meta.emojiPrincipal }}
      </div>
      <div v-else-if="imagePrincipale" class="rendu-figure rendu-image-principale">
        <img :src="imagePrincipale" alt="" />
      </div>

      <div class="rendu-texte" :style="{ color: meta.color || '#FFFFFF' }">
        <section>
          <h1>{{ meta.titre || "" }}</h1>
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div class="rendu-corps" v-html="texte"></div>
        </section>
      </div>
    </div>

    <div v-if="qr" class="rendu-qr">
      <img :src="qr" alt="QR code" />
    </div>
  </div>
</template>
