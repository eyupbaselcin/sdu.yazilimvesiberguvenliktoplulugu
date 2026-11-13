// Etkinlikler: herkes okuyabilir, yalnızca giriş yapmış yönetici ekleyip düzenleyebilir/silebilir.
// Liste GitHub deposundaki public/data/etkinlikler.json dosyasında, afişler public/assets/images/etkinlikler/
// altında saklanır. Her değişiklik bir commit'tir (geçmiş GitHub'da durur) ve Vercel siteyi otomatik yeniden yayınlar.
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { onbellekYok, oturumOku } from './_ortak.js';
import { CakismaHatasi, commitYap, dosyaOku, githubKuruluMu, hamAdres, sonCommit } from './_github.js';

const LISTE_YOLU = 'public/data/etkinlikler.json';
const AFIS_KLASORU = 'public/assets/images/etkinlikler';
const YEREL_LISTE = path.join(process.cwd(), LISTE_YOLU);
const AFIS_EN_FAZLA = 3.5 * 1024 * 1024;
const AFIS_TURLERI = {
    'image/jpeg': { uzanti: 'jpg', imza: [0xff, 0xd8, 0xff] },
    'image/png': { uzanti: 'png', imza: [0x89, 0x50, 0x4e, 0x47] },
    'image/webp': { uzanti: 'webp', imza: [0x52, 0x49, 0x46, 0x46] },
};
const GITHUB_YOK_MESAJI = 'Etkinlik kaydı için GitHub bağlantısı kurulmamış (Vercel\'de GITHUB_TOKEN ayarı yok). Kurulum: GALERI_KURULUM.md';

class IstekHatasi extends Error {
    constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
    }
}

const sirala = (etkinlikler) => [...etkinlikler].sort((a, b) =>
    `${a.tarih} ${a.saat || ''}`.localeCompare(`${b.tarih} ${b.saat || ''}`));

function listeyiCoz(metin) {
    const veri = JSON.parse(metin || '[]');
    return Array.isArray(veri) ? veri : [];
}

async function yerelListe() {
    return listeyiCoz(await readFile(YEREL_LISTE, 'utf8'));
}

/** Herkese açık okuma: GitHub'daki en güncel liste; GitHub ayarlı değilse veya ulaşılamazsa yayındaki dosya. */
async function guncelListe() {
    if (!githubKuruluMu()) return yerelListe();
    try {
        const metin = await dosyaOku(LISTE_YOLU);
        return metin === null ? yerelListe() : listeyiCoz(metin);
    } catch (hata) {
        console.error('GitHub\'dan etkinlikler okunamadı, yayındaki dosya kullanılıyor:', hata.message);
        return yerelListe();
    }
}

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

/** Gönderilen afişi doğrular; depoya yazılacak dosyayı ve sitedeki adresini döner. */
function afisHazirla(veriUrl, tarih) {
    const eslesme = typeof veriUrl === 'string' && veriUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!eslesme) throw new IstekHatasi(400, 'Afiş JPG, PNG veya WEBP olmalı.');

    const tur = AFIS_TURLERI[eslesme[1]];
    const icerik = Buffer.from(eslesme[2], 'base64');
    if (icerik.length > AFIS_EN_FAZLA) throw new IstekHatasi(413, 'Afiş çok büyük (en fazla 3,5 MB).');
    if (!tur.imza.every((bayt, i) => icerik[i] === bayt)) throw new IstekHatasi(400, 'Afiş dosyası bozuk veya resim değil.');

    const ad = `${tarih}-${randomBytes(4).toString('hex')}.${tur.uzanti}`;
    return { degisiklik: { yol: `${AFIS_KLASORU}/${ad}`, ikili: icerik }, adres: `/assets/images/etkinlikler/${ad}` };
}

/** Yalnızca panelden yüklenmiş afişler silinir; eski elle eklenen görsellere dokunulmaz. */
function afisSilme(adres) {
    const onek = '/assets/images/etkinlikler/';
    if (typeof adres !== 'string' || !adres.startsWith(onek) || !/^[\w.-]+$/.test(adres.slice(onek.length))) return [];
    return [{ yol: `public${adres}`, sil: true }];
}

function yoneticiKontrol(req) {
    // Başka sitelerden gelen değişiklik isteklerini reddet.
    const kaynak = req.headers.origin;
    if (kaynak) {
        let kaynakHost = '';
        try { kaynakHost = new URL(kaynak).host; } catch { /* geçersiz kaynak */ }
        if (kaynakHost !== req.headers.host) throw new IstekHatasi(403, 'Geçersiz istek kaynağı.');
    }
    const oturum = oturumOku(req);
    if (!oturum) throw new IstekHatasi(401, 'Bu işlem için giriş yapmanız gerekiyor.');
    return oturum;
}

/**
 * Listeyi GitHub'dan okuyup islem() ile değiştirir ve tek commit'te yazar.
 * Aynı anda başka bir değişiklik olursa baştan okuyup yeniden dener.
 */
async function listeyiDegistir(islem) {
    for (let deneme = 0; deneme < 3; deneme += 1) {
        const temel = await sonCommit();
        const liste = listeyiCoz(await dosyaOku(LISTE_YOLU, temel.sha) || '[]');
        const { yeniListe, dosyalar = [], mesaj, sonuc } = islem(liste);
        try {
            await commitYap(temel, [
                ...dosyalar,
                { yol: LISTE_YOLU, metin: `${JSON.stringify(sirala(yeniListe), null, 2)}\n` },
            ], mesaj);
            return sonuc;
        } catch (hata) {
            if (!(hata instanceof CakismaHatasi)) throw hata;
        }
    }
    throw new IstekHatasi(409, 'Aynı anda başka bir değişiklik yapıldı. Lütfen tekrar deneyin.');
}

export default async function handler(req, res) {
    try {
        if (req.method === 'GET') {
            const etkinlikler = await guncelListe();
            if (req.query.taze) {
                onbellekYok(res);
            } else {
                res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
            }
            // hamAdres: yeni yüklenen afiş site yeniden yayınlanana kadar (~1 dk) buradan gösterilir.
            return res.status(200).json({ etkinlikler: sirala(etkinlikler), hamAdres: `${hamAdres()}/public` });
        }

        onbellekYok(res);
        if (!['POST', 'PUT', 'DELETE'].includes(req.method)) {
            res.setHeader('Allow', 'GET, POST, PUT, DELETE');
            throw new IstekHatasi(405, 'Geçersiz istek.');
        }
        const oturum = yoneticiKontrol(req);
        if (!githubKuruluMu()) throw new IstekHatasi(503, GITHUB_YOK_MESAJI);

        const govde = typeof req.body === 'object' && req.body !== null ? req.body : {};
        const imza = `\n\nYönetim panelinden: ${oturum.isim}`;

        if (req.method === 'POST') {
            const alanlar = alanlariDogrula(govde);
            if (!govde.afisVeri) throw new IstekHatasi(400, 'Lütfen bir afiş yükleyin.');
            const afis = afisHazirla(govde.afisVeri, alanlar.tarih);
            const yeni = { id: `e-${alanlar.tarih}-${randomBytes(4).toString('hex')}`, ...alanlar, afis: afis.adres };
            const etkinlik = await listeyiDegistir((liste) => ({
                yeniListe: [...liste, yeni],
                dosyalar: [afis.degisiklik],
                mesaj: `Etkinlik eklendi: ${yeni.ad}${imza}`,
                sonuc: yeni,
            }));
            return res.status(201).json({ etkinlik });
        }

        const id = typeof (req.query.id || govde.id) === 'string' ? (req.query.id || govde.id) : '';

        if (req.method === 'PUT') {
            const alanlar = alanlariDogrula(govde);
            const yeniAfis = govde.afisVeri ? afisHazirla(govde.afisVeri, alanlar.tarih) : null;
            const etkinlik = await listeyiDegistir((liste) => {
                const eski = liste.find((e) => e.id === id);
                if (!eski) throw new IstekHatasi(404, 'Etkinlik bulunamadı.');
                const guncel = { ...eski, ...alanlar, afis: yeniAfis ? yeniAfis.adres : eski.afis };
                const eskiAfisKullaniliyor = liste.some((e) => e.id !== id && e.afis === eski.afis);
                return {
                    yeniListe: liste.map((e) => (e.id === id ? guncel : e)),
                    dosyalar: yeniAfis ? [yeniAfis.degisiklik, ...(eskiAfisKullaniliyor ? [] : afisSilme(eski.afis))] : [],
                    mesaj: `Etkinlik güncellendi: ${guncel.ad}${imza}`,
                    sonuc: guncel,
                };
            });
            return res.status(200).json({ etkinlik });
        }

        // DELETE
        await listeyiDegistir((liste) => {
            const eski = liste.find((e) => e.id === id);
            if (!eski) throw new IstekHatasi(404, 'Etkinlik bulunamadı.');
            // Silinen afiş GitHub geçmişinde kalır; gerekirse geri alınabilir.
            const baskaKullanan = liste.some((e) => e.id !== id && e.afis === eski.afis);
            return {
                yeniListe: liste.filter((e) => e.id !== id),
                dosyalar: baskaKullanan ? [] : afisSilme(eski.afis),
                mesaj: `Etkinlik silindi: ${eski.ad}${imza}`,
            };
        });
        return res.status(200).json({ silindi: id });
    } catch (hata) {
        if (hata instanceof IstekHatasi) {
            return res.status(hata.kod).json({ mesaj: hata.message });
        }
        console.error('Etkinlik API hatası:', hata);
        const yetkiYok = hata && (hata.durum === 401 || hata.durum === 403 || hata.durum === 404);
        return res.status(500).json({
            mesaj: yetkiYok
                ? 'GitHub kaydı reddetti: GITHUB_TOKEN geçersiz, süresi dolmuş veya bu depoya yazma izni yok.'
                : 'Sunucu hatası. Lütfen tekrar deneyin.',
        });
    }
}

export const config = {
    api: { bodyParser: { sizeLimit: '4.5mb' } },
};
