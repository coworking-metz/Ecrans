import { defineStore } from "pinia";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/supabase";

export const useEcransStore = defineStore("ecrans", {
  state: () => ({
    ecrans: [],
  }),
  actions: {
    getEcranBySlug(slug) {
      return this.ecrans.find((ecran) => ecran.slug == slug);
    },
    getEcran(id) {
      return this.ecrans.find((ecran) => ecran.id == id);
    },
    async fetchEcrans() {
      const { data, error } = await supabase.from("ecrans").select("*");

      if (!error) {
        this.ecrans = data;
      }
    },
    async ecranSlides(id) {
      const { data, error } = await supabase
        .from("liens_ecrans_slides")
        .select("*")
        .eq("ecran_id", id);

      const ids = data.map((lien) => lien.slideId);
      const response = await supabase.from("slides").select("*").in("id", ids);
      return response.data;
    },
    async fetchEcran(id) {
      let ret;
      if (typeof id == "string") {
        ret = supabase.from("ecrans").select("*").eq("slug", id);
      } else {
        ret = supabase.from("ecrans").select("*").eq("id", id);
      }
      const { data, error } = await ret;
      if (!error) {
        return data[0];
      }
    },
  },
});
