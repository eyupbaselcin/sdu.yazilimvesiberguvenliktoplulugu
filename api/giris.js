import { kullaniciDogrula, kullaniciSayisi, onbellekYok, oturumAc } from './_ortak.js';

export default async function handler(req, res) {
    onbellekYok(res);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ basarili: false, mesaj: 'Geçersiz istek.' });
    }

    const govde = typeof req.body === 'object' && req.body !== null ? req.body : {};
    const kimlik = typeof govde.kimlik === 'string' ? govde.kimlik.slice(0, 200) : '';
    const sifre = typeof govde.sifre === 'string' ? govde.sifre.slice(0, 200) : '';

    if (!kimlik || !sifre) {
        return res.status(400).json({ basarili: false, mesaj: 'Kullanıcı adı/e-posta ve şifre gerekli.' });
    }

    if (!kullaniciSayisi() || !process.env.OTURUM_SIRRI) {
        return res.status(503).json({
            basarili: false,
            mesaj: 'Henüz yönetici şifresi oluşturulmadı. Proje klasöründe "node tools/sifre-olustur.mjs" komutunu çalıştırın.',
        });
    }

    try {
        const kullanici = await kullaniciDogrula(kimlik, sifre);
        if (!kullanici) {
            return res.status(401).json({ basarili: false, mesaj: 'Kullanıcı adı veya şifre hatalı.' });
        }

        oturumAc(res, kullanici.isim);
        return res.status(200).json({ basarili: true, isim: kullanici.isim });
    } catch (hata) {
        console.error('Giriş hatası:', hata);
        return res.status(500).json({ basarili: false, mesaj: 'Giriş sistemi yapılandırılmamış.' });
    }
}
