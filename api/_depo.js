// Vercel Blob üzerinde sürümlü JSON saklama ve ortak istek yardımcıları.
import { randomBytes } from 'node:crypto';
import { BlobError, BlobPreconditionFailedError, get, list, put } from '@vercel/blob';
import { oturumOku } from './_ortak.js';

export class IstekHatasi extends Error {
    constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
    }
}

export const depoKuruluMu = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()
    || (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN));
export const DEPO_YOK_MESAJI = 'Vercel Blob bağlantısı eksik. Private Blob deposunu projeye bağlayın, ortam değişkenlerini etkinleştirin ve Redeploy yapın. Bkz. KAYIT_FORMU_KURULUM.md.';

export async function jsonGetir(url) {
    const access = String(url).includes('://') && !String(url).includes('.private.blob.') ? 'public' : 'private';
    return get(url, { access, useCache: false });
}

export const rastgele = (bayt = 8) => randomBytes(bayt).toString('hex');

/** Bir önekteki tüm blob'ları (sayfa sayfa) listeler. */
export async function hepsiniListele(onek) {
    const sonuc = [];
    let cursor;
    do {
        const sayfa = await list({ prefix: onek, limit: 1000, cursor });
        sonuc.push(...sayfa.blobs);
        cursor = sayfa.hasMore ? sayfa.cursor : undefined;
    } while (cursor);
    return sonuc;
}

export async function jsonOku(url) {
    const yanit = await jsonGetir(url);
    if (!yanit || yanit.statusCode !== 200) throw new IstekHatasi(503, 'Depodaki bir kayıt okunamadı. Lütfen tekrar deneyin.');
    return new Response(yanit.stream).json();
}

/** Önekteki en yeni sürümü okur; hiç yoksa null döner. */
export async function sonSurumuOku(onek) {
    const guncel = await jsonGetir(`${onek}guncel.json`);
    if (guncel) {
        return { veri: await new Response(guncel.stream).json(), surumler: [], etag: guncel.blob.etag };
    }
    const blobs = (await hepsiniListele(onek)).filter((b) => !b.pathname.endsWith('guncel.json'));
    if (!blobs.length) return { veri: null, surumler: [], etag: null };
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return { veri: await jsonOku(blobs[0].url), surumler: blobs, etag: null };
}

/** Geçmişi korur, aktif formu ETag kontrolüyle atomik günceller. */
export async function surumYaz(onek, veri, etag) {
    // Geçmiş önce yazılır; başarısız CAS durumunda bu dosya aktif form olarak okunmaz.
    // Geçmiş otomatik silinmez: eski başvuruların sürümleri korunur.
    await put(`form/gecmis-${Date.now()}-${rastgele(4)}.json`, JSON.stringify(veri), {
        access: 'private',
        contentType: 'application/json',
        addRandomSuffix: false,
    });
    try {
        await put(`${onek}guncel.json`, JSON.stringify(veri), {
            access: 'private', contentType: 'application/json', addRandomSuffix: false,
            ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
        });
    } catch (hata) {
        if (hata instanceof BlobPreconditionFailedError || blobZatenVar(hata)) {
            throw new IstekHatasi(409, 'Form başka bir yönetici tarafından değiştirildi. Sayfayı yenileyin.');
        }
        throw hata;
    }
}

export function blobZatenVar(hata) {
    return hata instanceof BlobError && /already exists/i.test(hata.message);
}

/** Değişiklik istekleri: aynı siteden gelmeli ve yönetici giriş yapmış olmalı. */
export function yoneticiKontrol(req) {
    kaynakKontrol(req);
    if (!oturumOku(req)) throw new IstekHatasi(401, 'Bu işlem için giriş yapmanız gerekiyor.');
}

export function kaynakKontrol(req) {
    const kaynak = req.headers.origin;
    if (!kaynak) return;
    let host = '';
    try { host = new URL(kaynak).host; } catch { /* geçersiz */ }
    if (host !== req.headers.host) throw new IstekHatasi(403, 'Geçersiz istek kaynağı.');
}

export function hataYaniti(res, hata, baglam) {
    if (hata instanceof IstekHatasi) {
        return res.status(hata.kod).json({ mesaj: hata.message });
    }
    console.error(`${baglam} hatası:`, hata);
    if (/access.*(private|public)|(private|public).*access/i.test(hata.message || '')) {
        return res.status(503).json({ mesaj: 'Blob erişim türü uyumsuz. Kişisel veriler için Private depo gereklidir. Public depodaki verileri taşımadan silmeyin. Bkz. KAYIT_FORMU_KURULUM.md.' });
    }
    if (hata instanceof BlobError) {
        return res.status(503).json({ mesaj: 'Vercel Blob işlem yapamadı. Depo bağlantısını, ortam izinlerini, token süresini ve kotayı kontrol edip Redeploy yapın.' });
    }
    return res.status(500).json({ mesaj: 'Sunucu hatası. Lütfen tekrar deneyin.' });
}

/** Kontrol karakterlerini temizler; satır sonları isteğe bağlı korunur. */
export function temizMetin(deger, { enFazla, satirSonu = false }) {
    if (typeof deger !== 'string') return '';
    let s = deger.replace(/\r\n?/g, '\n');
    s = satirSonu
        ? s.replace(/[\u0000-\u0009\u000B-\u001F\u007F]+/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
        : s.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ');
    return s.trim().slice(0, enFazla);
}
