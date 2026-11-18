// Yalnızca yöneticiye, veri/anahtar göstermeden canlı bağlantı teşhisi.
import { list } from '@vercel/blob';
import { onbellekYok } from './_ortak.js';
import { depoKuruluMu, DEPO_YOK_MESAJI, hataYaniti, IstekHatasi, yoneticiKontrol } from './_depo.js';
import { githubKuruluMu, sonCommit } from './_github.js';

export default async function handler(req, res) {
    onbellekYok(res);
    try {
        yoneticiKontrol(req);
        if (req.method !== 'GET') {
            res.setHeader('Allow', 'GET');
            throw new IstekHatasi(405, 'Geçersiz istek.');
        }
        if (!depoKuruluMu()) throw new IstekHatasi(503, DEPO_YOK_MESAJI);
        const { blobs } = await list({ limit: 1 });
        const erisim = blobs.length
            ? (blobs[0].url.includes('.private.blob.') ? 'private' : 'public')
            : 'bos-depo-panelden-private-oldugunu-dogrulayin';
        let github = 'ayarlanmamis';
        if (githubKuruluMu()) {
            try { await sonCommit(); github = 'baglanti-basarili'; }
            catch { github = 'baglanti-basarisiz-token-depo-dal-kontrol-edin'; }
        }
        return res.status(200).json({
            blob: 'okuma-basarili', erisim, github,
            not: 'Bu kontrol veri yazmaz. Yazma izni ve kota, kontrollü bir form kaydıyla ayrıca doğrulanmalıdır.',
        });
    } catch (hata) {
        return hataYaniti(res, hata, 'Depo teşhis');
    }
}
