import { onbellekYok, oturumOku } from './_ortak.js';

// Giriş yapılmış mı? Sayfalar bunu sorarak paneli/galeriyi gösterir.
export default function handler(req, res) {
    onbellekYok(res);
    try {
        const oturum = oturumOku(req);
        return res.status(200).json({ girisYapildi: Boolean(oturum), isim: oturum ? oturum.isim : null });
    } catch (hata) {
        console.error('Oturum hatası:', hata);
        return res.status(500).json({ girisYapildi: false, isim: null });
    }
}
