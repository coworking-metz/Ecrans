import { defineStore } from "pinia";
import { createClient } from "@supabase/supabase-js";
import supabase from "@/supabase";

export const useMediasStore = defineStore("medias", {
  state: () => ({
    medias: [],
  }),
  actions: {
    async fetchMedias() {
      const { data, error } = await supabase.storage
        .from("medias")
        .list("medias", {
          // limit: 100,
          // offset: 0,
          sortBy: { column: "name", order: "asc" },
        });

      console.log(data);
      if (!error) {
        const files = data;

        this.medias = [];
        const medias = [];
        for (let file of files) {
          if (file.name.substr(0, 1) == ".") continue;
          const { data } = supabase.storage
            .from("medias")
            .getPublicUrl(`medias/${file.name}`);

          const url = data.publicUrl;

          const media = {
            file: file,
            url: url,
            thumbnail: url.replace("medias/medias/", "medias/thumbnails/"),
          };
          media.index = JSON.stringify(media);

          medias.push(media);
        }
        this.medias = medias.sort((a, b) => {
          return new Date(b.lastModified) - new Date(a.lastModified);
        });
      }
    },
  },
});
