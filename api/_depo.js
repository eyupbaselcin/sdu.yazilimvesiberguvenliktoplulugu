// Vercel Blob üzerinde sürümlü JSON saklama ve ortak istek yardımcıları.
import { randomBytes } from 'node:crypto';
import { del, list, put } from '@vercel/blob';
import { oturumOku } from './_ortak.js';

export class IstekHatasi extends Error {
    constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
    }
}

export const depoKuruluMu = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
export const DEPO_YOK_MESAJI = 'Depo kurulmamış (Vercel Blob). Kurulum için GALERI_KURULUM.md dosyasına bakın.';

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
    const yanit = await fetch(url, { cache: 'no-store' });
    if (!yanit.ok) throw new Error(`Okunamadı (${yanit.status}): ${url}`);
    return yanit.json();
}

/** Önekteki en yeni sürümü okur; hiç yoksa null döner. */
export async function sonSurumuOku(onek) {
    const { blobs } = await list({ prefix: onek, limit: 100 });
    if (!blobs.length) return { veri: null, surumler: [] };
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    return { veri: await jsonOku(blobs[0].url), surumler: blobs };
}

/** Yeni bir sürüm yazar ve en eski sürümleri siler (yanlışlıkla değişikliğe karşı son N sürüm tutulur). */
export async function surumYaz(onek, veri, eskiSurumler, saklanacak = 10) {
    await put(`${onek}${Date.now()}-${rastgele(4)}.json`, JSON.stringify(veri), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
    });
    const silinecek = eskiSurumler.slice(saklanacak - 1).map((b) => b.url);
    if (silinecek.length) {
        await del(silinecek).catch((hata) => console.error('Eski sürümler silinemedi:', hata));
    }
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
