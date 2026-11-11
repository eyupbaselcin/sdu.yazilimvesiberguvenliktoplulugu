import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// `npm run dev` sırasında api/ klasöründeki Vercel fonksiyonlarını (giriş, galeri, etkinlikler) yerelde çalıştırır.
// Ayarlar .env.local dosyasından okunur (node tools/sifre-olustur.mjs oluşturur). Yayındaki siteyi etkilemez.
function yerelApi() {
  return {
    name: "yerel-api",
    apply: "serve",
    configureServer(server) {
      const ortam = loadEnv("development", process.cwd(), "");
      for (const [anahtar, deger] of Object.entries(ortam)) {
        if (process.env[anahtar] === undefined) process.env[anahtar] = deger;
      }
      process.env.YEREL_GELISTIRME = "1"; // http://127.0.0.1 üzerinde çerez çalışsın diye "Secure" kapatılır

      server.middlewares.use(async (req, res, next) => {
        const adres = new URL(req.url, "http://yerel");
        const eslesme = adres.pathname.match(/^\/api\/([a-z-]+)$/);
        if (!eslesme) return next();

        let modul;
        try {
          modul = await server.ssrLoadModule(`/api/${eslesme[1]}.js`);
        } catch {
          return next();
        }

        res.status = (kod) => { res.statusCode = kod; return res; };
        res.json = (veri) => {
          if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(veri));
          return res;
        };
        res.send = (veri) => { res.end(veri); return res; };

        try {
          const parcalar = [];
          for await (const parca of req) parcalar.push(parca);
          const ham = Buffer.concat(parcalar).toString("utf8");
          const tur = req.headers["content-type"] || "";
          req.body = !ham ? undefined
            : tur.includes("application/json") ? JSON.parse(ham)
            : tur.includes("application/x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(ham))
            : ham;
        } catch {
          return res.status(400).json({ mesaj: "Geçersiz istek gövdesi." });
        }
        req.query = Object.fromEntries(adres.searchParams);

        try {
          await modul.default(req, res);
        } catch (hata) {
          console.error(hata);
          if (!res.headersSent) res.status(500).json({ mesaj: "Sunucu hatası." });
        }
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), yerelApi()],
  publicDir: "public",
  server: {
    // dist/ derleme çıktısıdır; izlenmesine gerek yok (dosya kopyalanırken kilitlenip sunucuyu çökertebiliyor).
    watch: { ignored: ["**/dist/**", "**/.vercel/**"] },
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        root: "index.html",
        home: "pages/index.html",
        events: "pages/etkinlik.html",
        contact: "pages/iletisim.html",
        login: "pages/giris.html",
        security: "pages/syber.html",
        signup: "pages/egitim-kayit.html",
        gallery: "pages/galeri.html",
        team: "pages/ToplulukHakkinda.html",
      },
    },
  },
});
