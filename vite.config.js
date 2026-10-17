import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        root: "index.html",
        home: "pages/index.html",
        events: "pages/etkinlik.html",
        games: "pages/oyunlar.html",
        contact: "pages/iletisim.html",
        login: "pages/giris.html",
        security: "pages/syber.html",
        team: "pages/ToplulukHakkinda.html",
      },
    },
  },
});
