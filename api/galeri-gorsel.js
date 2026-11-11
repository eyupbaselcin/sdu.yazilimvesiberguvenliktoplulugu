import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { onbellekYok, oturumOku } from './_ortak.js';
import { GORSEL_KLASORU, GORSEL_TURLERI } from './galeri.js';

// Tek bir galeri fotoğrafını yalnızca giriş yapmış kullanıcıya verir.
export default async function handler(req, res) {
    onbellekYok(res);

    let oturum = null;
    try {
        oturum = oturumOku(req);
    } catch (hata) {
        console.error('Oturum hatası:', hata);
    }
    if (!oturum) {
        return res.status(401).end();
    }

    const dosyaAdi = typeof req.query.dosya === 'string' ? req.query.dosya : '';
    const tur = GORSEL_TURLERI[path.extname(dosyaAdi).toLowerCase()];

    // Yalnızca klasördeki dosya adı kabul edilir; "../" gibi yollarla başka dosyaya erişilemez.
    if (!dosyaAdi || !tur || path.basename(dosyaAdi) !== dosyaAdi || dosyaAdi.startsWith('.')) {
        return res.status(404).end();
    }

    try {
        const icerik = await readFile(path.join(GORSEL_KLASORU, dosyaAdi));
        res.setHeader('Content-Type', tur);
        res.setHeader('Content-Length', icerik.length);
        return res.status(200).send(icerik);
    } catch {
        return res.status(404).end();
    }
}
