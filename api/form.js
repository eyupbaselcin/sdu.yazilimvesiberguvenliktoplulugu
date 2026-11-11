// Eğitim kayıt formunun tanımı (başlık, açıklamalar, sorular).
// Herkes okuyabilir (form sayfası bunu çizer); yalnızca yönetici değiştirebilir.
import { onbellekYok } from './_ortak.js';
import {
    DEPO_YOK_MESAJI, IstekHatasi, depoKuruluMu, hataYaniti, rastgele, sonSurumuOku, surumYaz, temizMetin, yoneticiKontrol,
} from './_depo.js';

const ONEK = 'form/tanim-';
export const SORU_TURLERI = ['kisa', 'uzun', 'eposta', 'telefon', 'secim', 'coklu'];

export const VARSAYILAN_FORM = {
    ustBaslik: 'Süleyman Demirel Üniversitesi Yazılım ve Siber Güvenlik Topluluğu',
    baslik: 'Algoritma ve Programlama Eğitimleri',
    uyari: 'LÜTFEN VS CODE VE ANTIGRAVITY KURULUMUNU YAPARAK GELİNİZ',
    maddeler: ['Temel seviyede C dili eğitimi', 'Yapay Zeka Destekli / Ezbersel değil mantıksal'],
    acik: true,
    sorular: [
        { id: 'ad_soyad', baslik: 'Ad Soyad', tur: 'kisa', zorunlu: true },
        {
            id: 'sinif', baslik: 'Kaçıncı sınıfsınız?', tur: 'secim', zorunlu: true,
            secenekler: ['Hazırlık', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Yüksek Lisans / Diğer'],
        },
        { id: 'telefon', baslik: 'İletişim numarası', tur: 'telefon', zorunlu: true },
        { id: 'eposta', baslik: 'E-posta adresi', tur: 'eposta', zorunlu: true },
    ],
};

export async function formuOku() {
    if (!depoKuruluMu()) return { form: VARSAYILAN_FORM, surumler: [] };
    const { veri, surumler } = await sonSurumuOku(ONEK);
    return { form: veri || VARSAYILAN_FORM, surumler };
}

function formuDogrula(govde) {
    const sorularHam = Array.isArray(govde.sorular) ? govde.sorular : [];
    if (!sorularHam.length) throw new IstekHatasi(400, 'Formda en az bir soru olmalı.');
    if (sorularHam.length > 30) throw new IstekHatasi(400, 'Formda en fazla 30 soru olabilir.');

    const kullanilanIdler = new Set();
    const sorular = sorularHam.map((s, i) => {
        const baslik = temizMetin(s && s.baslik, { enFazla: 200 });
        if (!baslik) throw new IstekHatasi(400, `${i + 1}. sorunun metni boş olamaz.`);
        const tur = SORU_TURLERI.includes(s.tur) ? s.tur : 'kisa';

        // Var olan sorunun kimliği korunur (eski yanıtlar eşleşmeye devam etsin), yeniye kimlik verilir.
        let id = typeof s.id === 'string' && /^[a-z0-9_-]{1,40}$/.test(s.id) ? s.id : `s_${rastgele(4)}`;
        while (kullanilanIdler.has(id)) id = `s_${rastgele(4)}`;
        kullanilanIdler.add(id);

        const soru = { id, baslik, tur, zorunlu: Boolean(s.zorunlu) };
        const aciklama = temizMetin(s.aciklama, { enFazla: 300 });
        if (aciklama) soru.aciklama = aciklama;

        if (tur === 'secim' || tur === 'coklu') {
            const secenekler = [...new Set((Array.isArray(s.secenekler) ? s.secenekler : [])
                .map((x) => temizMetin(x, { enFazla: 100 }))
                .filter(Boolean))];
            if (secenekler.length < 2) throw new IstekHatasi(400, `"${baslik}" sorusu için en az 2 seçenek girin.`);
            if (secenekler.length > 30) throw new IstekHatasi(400, `"${baslik}" sorusunda en fazla 30 seçenek olabilir.`);
            soru.secenekler = secenekler;
        }
        return soru;
    });

    const baslik = temizMetin(govde.baslik, { enFazla: 150 });
    if (!baslik) throw new IstekHatasi(400, 'Form başlığı boş olamaz.');

    return {
        ustBaslik: temizMetin(govde.ustBaslik, { enFazla: 150 }),
        baslik,
        uyari: temizMetin(govde.uyari, { enFazla: 300 }),
        maddeler: (Array.isArray(govde.maddeler) ? govde.maddeler : [])
            .map((m) => temizMetin(m, { enFazla: 200 }))
            .filter(Boolean)
            .slice(0, 15),
        acik: govde.acik !== false,
        sorular,
    };
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { form } = await formuOku();
            if (req.query.taze) {
                onbellekYok(res);
            } else {
                res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
            }
            return res.status(200).json({ form });
        }

        onbellekYok(res);
        if (req.method !== 'PUT') {
            res.setHeader('Allow', 'GET, PUT');
            throw new IstekHatasi(405, 'Geçersiz istek.');
        }
        yoneticiKontrol(req);
        if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);

        const yeni = formuDogrula(typeof req.body === 'object' && req.body !== null ? req.body : {});
        const { surumler } = await formuOku();
        await surumYaz(ONEK, yeni, surumler);
        return res.status(200).json({ form: yeni });
    } catch (hata) {
        return hataYaniti(res, hata, 'Form');
    }
}
