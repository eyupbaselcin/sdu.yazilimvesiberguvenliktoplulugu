import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { onbellekYok, oturumOku } from './_ortak.js';

export const GORSEL_KLASORU = path.join(process.cwd(), 'galeri-private', 'images');
export const GORSEL_TURLERI = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
};

// Giriş yapan kullanıcıya galerideki fotoğrafların listesini döner.
export default async function handler(req, res) {
    onbellekYok(res);

    let oturum = null;
    try {
        oturum = oturumOku(req);
    } catch (hata) {
        console.error('Oturum hatası:', hata);
    }
    if (!oturum) {
        return res.status(401).json({ mesaj: 'Giriş yapmanız gerekiyor.' });
    }

    let dosyalar = [];
    try {
        dosyalar = await readdir(GORSEL_KLASORU);
    } catch {
        dosyalar = [];
    }

    const gorseller = dosyalar
        .filter((ad) => GORSEL_TURLERI[path.extname(ad).toLowerCase()])
        .sort((a, b) => a.localeCompare(b, 'tr', { numeric: true, sensitivity: 'base' }));

    return res.status(200).json({ gorseller });
}
