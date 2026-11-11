// Kayıt formu yanıtları.
// POST: herkes form gönderebilir (sorulara göre doğrulanır).
// GET / DELETE: yalnızca yönetici yanıtları görür ve siler.
// Her yanıt ayrı, tahmin edilemez adlı bir dosyada saklanır; aynı anda gelen kayıtlar birbirini ezmez.
import { del, put } from '@vercel/blob';
import { onbellekYok } from './_ortak.js';
import {
    DEPO_YOK_MESAJI, IstekHatasi, depoKuruluMu, hataYaniti, hepsiniListele, jsonOku, kaynakKontrol, rastgele,
    temizMetin, yoneticiKontrol,
} from './_depo.js';
import { formuOku } from './form.js';

const ONEK = 'yanitlar/';
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cevapDogrula(soru, ham) {
    const bos = ham === undefined || ham === null || ham === '' || (Array.isArray(ham) && !ham.length);
    if (bos) {
        if (soru.zorunlu) throw new IstekHatasi(422, `"${soru.baslik}" sorusu zorunlu.`);
        return soru.tur === 'coklu' ? [] : '';
    }

    switch (soru.tur) {
        case 'secim': {
            if (typeof ham !== 'string' || !soru.secenekler.includes(ham)) {
                throw new IstekHatasi(422, `"${soru.baslik}" için geçerli bir seçenek seçin.`);
            }
            return ham;
        }
        case 'coklu': {
            const liste = (Array.isArray(ham) ? ham : [ham]).filter((x) => typeof x === 'string');
            if (!liste.every((x) => soru.secenekler.includes(x))) {
                throw new IstekHatasi(422, `"${soru.baslik}" için geçerli seçenekler seçin.`);
            }
            return [...new Set(liste)];
        }
        case 'eposta': {
            const s = temizMetin(ham, { enFazla: 150 });
            if (!EPOSTA.test(s)) throw new IstekHatasi(422, `"${soru.baslik}" geçerli bir e-posta adresi olmalı.`);
            return s;
        }
        case 'telefon': {
            const s = temizMetin(ham, { enFazla: 20 });
            const rakam = s.replace(/\D/g, '').length;
            if (!/^[0-9+()\s-]+$/.test(s) || rakam < 10 || rakam > 13) {
                throw new IstekHatasi(422, `"${soru.baslik}" geçerli bir telefon numarası olmalı.`);
            }
            return s;
        }
        case 'uzun':
            return temizMetin(ham, { enFazla: 2000, satirSonu: true });
        default:
            return temizMetin(ham, { enFazla: 300 });
    }
}

async function yanitlariOku() {
    const bloblar = await hepsiniListele(ONEK);
    const yanitlar = [];
    // Aynı anda en fazla 16 dosya okunur.
    for (let i = 0; i < bloblar.length; i += 16) {
        const grup = await Promise.all(bloblar.slice(i, i + 16).map((b) => jsonOku(b.url).catch((hata) => {
            console.error('Yanıt okunamadı:', b.pathname, hata);
            return null;
        })));
        yanitlar.push(...grup.filter(Boolean));
    }
    return yanitlar.sort((a, b) => String(b.zaman).localeCompare(String(a.zaman)));
}

export default async function handler(req, res) {
    onbellekYok(res);
    try {
        if (req.method === 'POST') {
            kaynakKontrol(req);
            const govde = typeof req.body === 'object' && req.body !== null ? req.body : {};

            // Bot tuzağı: gerçek kullanıcılar bu gizli alanı boş bırakır.
            if (govde.web_sitesi) return res.status(201).json({ basarili: true });

            if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);

            const { form } = await formuOku();
            if (form.acik === false) throw new IstekHatasi(403, 'Bu form şu anda yanıt kabul etmiyor.');

            const gelen = typeof govde.cevaplar === 'object' && govde.cevaplar !== null ? govde.cevaplar : {};
            const cevaplar = form.sorular.map((soru) => ({
                soruId: soru.id,
                soru: soru.baslik,
                cevap: cevapDogrula(soru, gelen[soru.id]),
            }));

            const id = rastgele(16); // 128 bit: dosya adresi tahmin edilemez
            const yanit = { id, zaman: new Date().toISOString(), form: form.baslik, cevaplar };
            await put(`${ONEK}${id}.json`, JSON.stringify(yanit), {
                access: 'public',
                contentType: 'application/json',
                addRandomSuffix: false,
            });
            return res.status(201).json({ basarili: true });
        }

        if (req.method === 'GET') {
            yoneticiKontrol(req);
            if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);
            return res.status(200).json({ yanitlar: await yanitlariOku() });
        }

        if (req.method === 'DELETE') {
            yoneticiKontrol(req);
            if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);
            const id = typeof req.query.id === 'string' ? req.query.id : '';
            if (!/^[0-9a-f]{32}$/.test(id)) throw new IstekHatasi(400, 'Geçersiz yanıt.');
            const [blob] = await hepsiniListele(`${ONEK}${id}.json`);
            if (!blob) throw new IstekHatasi(404, 'Yanıt bulunamadı.');
            await del(blob.url);
            return res.status(200).json({ silindi: id });
        }

        res.setHeader('Allow', 'GET, POST, DELETE');
        throw new IstekHatasi(405, 'Geçersiz istek.');
    } catch (hata) {
        return hataYaniti(res, hata, 'Yanıt');
    }
}
