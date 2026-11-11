// Etkinlikler: herkes okuyabilir, yalnızca giriş yapmış yönetici ekleyip düzenleyebilir/silebilir.
// Veriler Vercel Blob'da saklanır (BLOB_READ_WRITE_TOKEN). Blob boşken public/data/etkinlikler.json kullanılır.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { del, list, put } from '@vercel/blob';
import { onbellekYok, oturumOku } from './_ortak.js';

const LISTE_ONEKI = 'etkinlikler/liste-';
const SAKLANACAK_SURUM = 10; // yanlışlıkla silmeye karşı son 10 sürüm tutulur
const BASLANGIC_DOSYASI = path.join(process.cwd(), 'public', 'data', 'etkinlikler.json');
const AFIS_EN_FAZLA = 3.5 * 1024 * 1024;
const AFIS_TURLERI = {
    'image/jpeg': { uzanti: 'jpg', imza: [0xff, 0xd8, 0xff] },
    'image/png': { uzanti: 'png', imza: [0x89, 0x50, 0x4e, 0x47] },
    'image/webp': { uzanti: 'webp', imza: [0x52, 0x49, 0x46, 0x46] },
};

class IstekHatasi extends Error {
    constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
    }
}

const depoKuruluMu = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

async function listeyiOku() {
    if (!depoKuruluMu()) {
        return { etkinlikler: JSON.parse(await readFile(BASLANGIC_DOSYASI, 'utf8')), surumler: [] };
    }
    const { blobs } = await list({ prefix: LISTE_ONEKI, limit: 100 });
    if (blobs.length) {
        blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        const yanit = await fetch(blobs[0].url, { cache: 'no-store' });
        if (!yanit.ok) throw new Error(`Etkinlik listesi okunamadı: ${yanit.status}`);
        return { etkinlikler: await yanit.json(), surumler: blobs };
    }
    return { etkinlikler: JSON.parse(await readFile(BASLANGIC_DOSYASI, 'utf8')), surumler: [] };
}

async function listeyiYaz(etkinlikler, eskiSurumler) {
    // Her kayıt yeni bir dosya adıyla yazılır; böylece önbellekten eski liste gelmez.
    await put(`${LISTE_ONEKI}${Date.now()}-${randomBytes(4).toString('hex')}.json`, JSON.stringify(etkinlikler), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
    });
    const silinecek = eskiSurumler.slice(SAKLANACAK_SURUM - 1).map((b) => b.url);
    if (silinecek.length) {
        await del(silinecek).catch((hata) => console.error('Eski sürümler silinemedi:', hata));
    }
}

const sirala = (etkinlikler) => [...etkinlikler].sort((a, b) =>
    `${a.tarih} ${a.saat || ''}`.localeCompare(`${b.tarih} ${b.saat || ''}`));

function metin(deger, ad, { en = 0, enFazla }) {
    const s = typeof deger === 'string' ? deger.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim() : '';
    if (s.length < en || s.length > enFazla) {
        throw new IstekHatasi(400, `${ad} ${en ? `${en}-` : 'en fazla '}${enFazla} karakter olmalı.`);
    }
    return s;
}

function alanlariDogrula(govde) {
    const tarih = typeof govde.tarih === 'string' ? govde.tarih : '';
    const tarihNesnesi = new Date(`${tarih}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || Number.isNaN(tarihNesnesi.getTime())
        || tarihNesnesi.toISOString().slice(0, 10) !== tarih) {
        throw new IstekHatasi(400, 'Geçerli bir tarih seçin.');
    }
    const saat = typeof govde.saat === 'string' ? govde.saat : '';
    if (saat && !/^([01]\d|2[0-3]):[0-5]\d$/.test(saat)) {
        throw new IstekHatasi(400, 'Saat SS:DD biçiminde olmalı.');
    }

    // Açıklamada satır sonları korunur.
    const aciklama = typeof govde.aciklama === 'string' ? govde.aciklama.replace(/\r\n?/g, '\n').trim() : '';
    if (aciklama.length > 1500) throw new IstekHatasi(400, 'Açıklama en fazla 1500 karakter olmalı.');

    return {
        ad: metin(govde.ad, 'Etkinlik adı', { en: 3, enFazla: 120 }),
        kategori: metin(govde.kategori, 'Kategori', { en: 2, enFazla: 30 }),
        tarih,
        saat,
        yer: metin(govde.yer, 'Yer', { enFazla: 120 }),
        aciklama,
    };
}

async function afisYukle(veriUrl, id) {
    const eslesme = typeof veriUrl === 'string' && veriUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!eslesme) throw new IstekHatasi(400, 'Afiş JPG, PNG veya WEBP olmalı.');

    const tur = AFIS_TURLERI[eslesme[1]];
    const icerik = Buffer.from(eslesme[2], 'base64');
    if (icerik.length > AFIS_EN_FAZLA) throw new IstekHatasi(413, 'Afiş çok büyük (en fazla 3,5 MB).');
    if (!tur.imza.every((bayt, i) => icerik[i] === bayt)) throw new IstekHatasi(400, 'Afiş dosyası bozuk veya resim değil.');

    const { url } = await put(`afisler/${id}-${randomBytes(6).toString('hex')}.${tur.uzanti}`, icerik, {
        access: 'public',
        contentType: eslesme[1],
        addRandomSuffix: false,
    });
    return url;
}

async function afisSil(url) {
    if (typeof url === 'string' && url.includes('.blob.vercel-storage.com/afisler/')) {
        await del(url).catch((hata) => console.error('Afiş silinemedi:', hata));
    }
}

function yoneticiKontrol(req) {
    // Başka sitelerden gelen değişiklik isteklerini reddet.
    const kaynak = req.headers.origin;
    if (kaynak) {
        let kaynakHost = '';
        try { kaynakHost = new URL(kaynak).host; } catch { /* geçersiz kaynak */ }
        if (kaynakHost !== req.headers.host) throw new IstekHatasi(403, 'Geçersiz istek kaynağı.');
    }
    if (!oturumOku(req)) throw new IstekHatasi(401, 'Bu işlem için giriş yapmanız gerekiyor.');
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const { etkinlikler } = await listeyiOku();
            if (req.query.taze) {
                onbellekYok(res);
            } else {
                res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
            }
            return res.status(200).json({ etkinlikler: sirala(etkinlikler) });
        }

        onbellekYok(res);
        if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
            res.setHeader('Allow', 'GET, POST, PUT, DELETE');
            throw new IstekHatasi(405, 'Geçersiz istek.');
        }
        yoneticiKontrol(req);
        if (!depoKuruluMu()) {
            throw new IstekHatasi(503, 'Etkinlik deposu kurulmamış (Vercel Blob). Kurulum için GALERI_KURULUM.md dosyasına bakın.');
        }

        const govde = typeof req.body === 'object' && req.body !== null ? req.body : {};
        const { etkinlikler, surumler } = await listeyiOku();

        if (req.method === 'POST') {
            const alanlar = alanlariDogrula(govde);
            if (!govde.afisVeri) throw new IstekHatasi(400, 'Lütfen bir afiş yükleyin.');
            const id = `e-${alanlar.tarih}-${randomBytes(4).toString('hex')}`;
            const yeni = { id, ...alanlar, afis: await afisYukle(govde.afisVeri, id) };
            await listeyiYaz([...etkinlikler, yeni], surumler);
            return res.status(201).json({ etkinlik: yeni });
        }

        const id = typeof (req.query.id || govde.id) === 'string' ? (req.query.id || govde.id) : '';
        const sira = etkinlikler.findIndex((e) => e.id === id);
        if (sira === -1) throw new IstekHatasi(404, 'Etkinlik bulunamadı.');
        const eski = etkinlikler[sira];

        if (req.method === 'PUT') {
            const alanlar = alanlariDogrula(govde);
            const afis = govde.afisVeri ? await afisYukle(govde.afisVeri, id) : eski.afis;
            const guncel = { ...eski, ...alanlar, afis };
            const yeniListe = etkinlikler.map((e, i) => (i === sira ? guncel : e));
            await listeyiYaz(yeniListe, surumler);
            if (afis !== eski.afis) await afisSil(eski.afis);
            return res.status(200).json({ etkinlik: guncel });
        }

        // DELETE
        await listeyiYaz(etkinlikler.filter((e) => e.id !== id), surumler);
        // Afiş hemen silinmez: önceki liste sürümleri ona bağlı kalabilsin diye yerinde bırakılır.
        return res.status(200).json({ silindi: id });
    } catch (hata) {
        if (hata instanceof IstekHatasi) {
            return res.status(hata.kod).json({ mesaj: hata.message });
        }
        console.error('Etkinlik API hatası:', hata);
        const yapilandirilmamis = /BLOB_READ_WRITE_TOKEN|No token found/i.test(String(hata && hata.message));
        return res.status(500).json({
            mesaj: yapilandirilmamis
                ? 'Etkinlik deposu kurulmamış (Vercel Blob). Kurulum için GALERI_KURULUM.md dosyasına bakın.'
                : 'Sunucu hatası. Lütfen tekrar deneyin.',
        });
    }
}

export const config = {
    api: { bodyParser: { sizeLimit: '4.5mb' } },
};
