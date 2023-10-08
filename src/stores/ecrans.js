import { defineStore } from "pinia";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/supabase";

export const useEcransStore = defineStore("ecrans", {
  state: () => ({
    ecrans: [],
    slides: [],
  }),
  actions: {
    async fetchEcrans(slug) {
      const { data, error } = await supabase.from("ecrans").select("*");

      if (!error) {
        this.ecrans = data;
      }
    },
    async fetchSlides() {
      const { data, error } = await supabase.from("slides").select("*");

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
    async fetchEcran(id) {
      const { data, error } = await supabase
        .from("ecrans")
        .select("*")
        .eq("id", id);

      if (!error) {
        return data;
      }
    },
  },
});
