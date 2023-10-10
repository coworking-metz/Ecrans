import { defineStore } from "pinia";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/supabase";

export const useSlidesStore = defineStore("slides", {
  state: () => ({
    slides: [],
    liens: [],
    types: [
      { name: "Evenement", slug: "event" },
      { name: "Image", slug: "image" },
      { name: "Url", slug: "url" },
      { name: "Défaut", slug: "default" },
    ],
  }),
  actions: {
    checkEcran(slideId, ecranId) {
      for (let lien of this.liens) {
        if (lien.ecranid == ecranId) {
          if (lien.slideid == slideId) {
            return true;
          }
        }
      }
    },
    async fetchLiens() {
      const { data, error } = await supabase
        .from("liens_ecrans_slides")
        .select("*");

      if (!error) {
        this.liens = data;
      }
    },

    async fetchSlides(trash = false) {
      const { data, error } = await supabase
        .from("slides")
        .select("*")
        .eq("trash", trash);

      if (!error) {
        this.slides = data;
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
