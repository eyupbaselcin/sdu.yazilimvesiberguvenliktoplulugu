// Yönetici girişi: e-posta + şifre Firebase Authentication ile doğrulanır, ardından imzalı oturum çerezi verilir.
import { GirisHatasi, girisAyarSorunu, kullaniciDogrula, onbellekYok, oturumAc } from './_ortak.js';

export default async function handler(req, res) {
    onbellekYok(res);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ basarili: false, mesaj: 'Geçersiz istek.' });
    }

    const govde = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const eposta = typeof govde.eposta === 'string' ? govde.eposta.trim().slice(0, 200) : '';
    const sifre = typeof govde.sifre === 'string' ? govde.sifre.slice(0, 200) : '';

    if (!eposta || !sifre) {
        return res.status(400).json({ basarili: false, mesaj: 'E-posta ve şifre gerekli.' });
    }

    const ayarSorunu = girisAyarSorunu();
    if (ayarSorunu) {
        return res.status(503).json({ basarili: false, mesaj: ayarSorunu });
    }

    try {
        const kullanici = await kullaniciDogrula(eposta, sifre);
        oturumAc(res, kullanici.isim);
        return res.status(200).json({ basarili: true, isim: kullanici.isim });
    } catch (hata) {
        if (hata instanceof GirisHatasi) {
            return res.status(hata.kod).json({ basarili: false, mesaj: hata.message });
        }
        console.error('Giriş hatası:', hata);
        return res.status(500).json({ basarili: false, mesaj: 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
    }
}
