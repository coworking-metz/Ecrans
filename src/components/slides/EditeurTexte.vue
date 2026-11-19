<script setup>
/**
 * Éditeur de texte enrichi.
 *
 * Quill est conservé pour une raison précise : les contenus existants portent
 * ses classes (`ql-size-large`, `ql-font-serif`, `ql-align-center`…), que la
 * feuille de rendu sait déjà interpréter. En changer ferait perdre la mise en
 * forme des slides déjà écrits.
 */
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import Quill from "quill";
import "quill/dist/quill.snow.css";

const props = defineProps({
  modelValue: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const BARRE = [
  ["bold", "italic", "underline", "strike"],
  [{ header: 1 }, { header: 2 }],
  [{ size: ["small", false, "large", "huge"] }],
  [{ color: [] }, { background: [] }],
  [{ font: [] }],
  [{ align: [] }],
  ["clean"],
];

const hote = ref(null);
let quill = null;

onMounted(() => {
  quill = new Quill(hote.value, { theme: "snow", modules: { toolbar: BARRE } });
  quill.root.innerHTML = props.modelValue || "";

  quill.on("text-change", () => {
    const html = quill.root.innerHTML;
    // Quill laisse un paragraphe vide plutôt qu'une chaîne vide.
    emit("update:modelValue", html === "<p><br></p>" ? "" : html);
  });
});

// Le parent peut remplacer la valeur (chargement, changement de slide).
watch(
  () => props.modelValue,
  (valeur) => {
    if (!quill) return;
    const courant = quill.root.innerHTML === "<p><br></p>" ? "" : quill.root.innerHTML;
    if (valeur === courant) return;
    quill.root.innerHTML = valeur || "";
  }
);

onBeforeUnmount(() => {
  quill = null;
});
</script>

<template>
  <div ref="hote" class="editeur-texte"></div>
</template>
