import { defineStore } from "pinia";
import { createClient } from "@supabase/supabase-js";
import { useEcransStore } from "@/stores/ecrans";
import supabase from "@/supabase";

export const useSlidesStore = defineStore("slides", {
  state: () => ({
    slides: null,
    trash: null,
    liens: null,
    types: [
      // { name: "Evenement", slug: "event" },
      { name: "Image", slug: "image" },
      { name: "Url", slug: "url" },
      { name: "Défaut", slug: "default" },
    ],
  }),
  actions: {
    getSlide(slideId) {
      for (let slide of this.slides) {
        if (slide.id == slideId) {
          return slide;
        }
      }
    },
    getLiens(slideId) {
      const ecransStore = useEcransStore();
      let out = [];
      for (let lien of this.liens) {
        if (lien.slide_id == slideId) {
          out.push(lien);
        }
      }

      return out;
    },
    async getEcrans(slideId) {
      const ecransStore = useEcransStore();
      let out = [];
      for (let lien of this.liens) {
        if (lien.slide_id == slideId) {
          out.push(await ecransStore.fetchEcran(lien.ecran_id));
        }
      }

      return out;
    },
    async checkEcran(slideId, ecranId) {
      const ecrans = await this.getEcrans(slideId);
      for (const ecran of ecrans) {
        if (ecran.id == ecranId) return true;
      }
    },
    async fetchLiens(onlyIfEmpty = false) {
      if (onlyIfEmpty) {
        if (this.liens !== null) return;
      }
      this.liens = [];
      const { data, error } = await supabase
        .from("liens_ecrans_slides")
        .select("*");

      if (!error) {
        this.liens = data;
      }
    },

    async fetchSlides() {
      const slides = [];
      const trash = [];
      const { data, error } = await supabase.from("slides").select("*");

      if (!error) {
        data.forEach((slide) => {
          if (slide.trash) {
            trash.push(slide);
          } else {
            slides.push(slide);
          }
        });
        this.slides = slides;
        this.trash = trash;
      }
    },
    async fetchSlide(id) {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .eq("id", id);

      if (!error) {
        return data;
      }
    },
  },
});
