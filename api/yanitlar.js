// Kayıt formu yanıtları.
// POST: herkes form gönderebilir (sorulara göre doğrulanır).
// GET / DELETE: yalnızca yönetici yanıtları görür ve siler.
// Her yanıt ayrı, tahmin edilemez adlı bir dosyada saklanır; aynı anda gelen kayıtlar birbirini ezmez.
import { del, list, put } from '@vercel/blob';
import { createHash } from 'node:crypto';
import { onbellekYok } from './_ortak.js';
import {
    DEPO_YOK_MESAJI, IstekHatasi, depoKuruluMu, hataYaniti, hepsiniListele, jsonOku, kaynakKontrol,
    temizMetin, yoneticiKontrol, blobZatenVar,
} from './_depo.js';
import { formuOku } from './form.js';

const ONEK = 'yanitlar/';
const EPOSTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cevapDogrula(soru, ham) {
    if (ham !== undefined && ham !== null && typeof ham !== 'string'
        && !(soru.tur === 'coklu' && Array.isArray(ham) && ham.every((x) => typeof x === 'string'))) {
        throw new IstekHatasi(422, `"${soru.baslik}" için geçersiz veri türü.`);
    }
    if (typeof ham === 'string') ham = ham.trim();
    if (typeof ham === 'string' && soru.tur !== 'secim' && soru.tur !== 'coklu') {
        ham = temizMetin(ham, { enFazla: soru.tur === 'uzun' ? 2000 : 300, satirSonu: soru.tur === 'uzun' });
    }
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

async function yanitlariOku(cursor) {
    const sayfa = await list({ prefix: ONEK, limit: 100, cursor });
    const bloblar = sayfa.blobs;
    const yanitlar = [];
    // Aynı anda en fazla 16 dosya okunur.
    for (let i = 0; i < bloblar.length; i += 16) {
        const grup = await Promise.all(bloblar.slice(i, i + 16).map((b) => jsonOku(b.url)));
        yanitlar.push(...grup);
    }
    return { yanitlar, cursor: sayfa.hasMore ? sayfa.cursor : null };
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
            if (Boolean(process.env.TURNSTILE_SECRET_KEY) !== Boolean(process.env.TURNSTILE_SITE_KEY)) {
                throw new IstekHatasi(503, 'Spam koruması eksik yapılandırılmış. TURNSTILE_SITE_KEY ve TURNSTILE_SECRET_KEY birlikte ayarlanmalıdır.');
            }
            if (process.env.TURNSTILE_SECRET_KEY) {
                if (typeof govde.captcha !== 'string' || govde.captcha.length > 2048) throw new IstekHatasi(422, 'Lütfen güvenlik doğrulamasını tamamlayın.');
                const dogrulama = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: process.env.TURNSTILE_SECRET_KEY, response: govde.captcha }),
                    signal: AbortSignal.timeout(10000),
                });
                if (!dogrulama.ok) throw new IstekHatasi(503, 'Güvenlik doğrulamasına ulaşılamadı.');
                if (!(await dogrulama.json()).success) throw new IstekHatasi(422, 'Güvenlik doğrulaması başarısız. Tekrar deneyin.');
            }

            const { form } = await formuOku();
            if (form.acik === false) throw new IstekHatasi(403, 'Bu form şu anda yanıt kabul etmiyor.');
            if (govde.surum !== form.surum) throw new IstekHatasi(409, 'Form güncellendi. Sayfayı yenileyip tekrar gönderin.');
            if (!/^[0-9a-f]{32}$/.test(govde.istekId || '')) throw new IstekHatasi(400, 'Geçersiz gönderim kimliği. Sayfayı yenileyin.');

            const gelen = typeof govde.cevaplar === 'object' && govde.cevaplar !== null ? govde.cevaplar : {};
            const cevaplar = form.sorular.map((soru) => ({
                soruId: soru.id,
                soru: soru.baslik,
                cevap: cevapDogrula(soru, gelen[soru.id]),
            }));

            const id = govde.istekId;
            const ozet = createHash('sha256').update(JSON.stringify({ surum: form.surum, cevaplar })).digest('hex');
            const yanit = { id, zaman: new Date().toISOString(), form: form.baslik, surum: form.surum, ozet, cevaplar };
            try {
                await put(`${ONEK}${id}.json`, JSON.stringify(yanit), {
                    access: 'private', contentType: 'application/json',
                    addRandomSuffix: false, allowOverwrite: false,
                });
            } catch (hata) {
                if (!blobZatenVar(hata)) throw hata;
                const eski = await jsonOku(`${ONEK}${id}.json`);
                if (eski.ozet !== ozet) throw new IstekHatasi(409, 'Bu gönderim kimliği farklı bir kayıt için kullanılmış. Sayfayı yenileyin.');
            }
            return res.status(201).json({ basarili: true, id });
        }

        if (req.method === 'GET') {
            yoneticiKontrol(req);
            if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);
            return res.status(200).json(await yanitlariOku(typeof req.query.cursor === 'string' ? req.query.cursor : undefined));
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
