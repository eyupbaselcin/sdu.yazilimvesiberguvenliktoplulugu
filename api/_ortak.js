// Vercel sunucu fonksiyonlarının ortak kodu. "_" ile başladığı için Vercel bunu ayrı bir adres olarak yayınlamaz.
import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

export const SIFRE_ITERASYON = 600000;
const OTURUM_CEREZI = 'ysgt_oturum';
const OTURUM_SURESI_SN = 8 * 60 * 60; // 8 saat

// Vercel paneline yapıştırırken değerin başında/sonunda kalabilen boşluk ve tırnakları temizler.
function ortamDegeri(ad) {
    let deger = String(process.env[ad] || '').trim();
    while (deger.length >= 2 && /^(['"`]).*\1$/s.test(deger)) {
        deger = deger.slice(1, -1).trim();
    }
    return deger;
}

function oturumSirri() {
    const sir = ortamDegeri('OTURUM_SIRRI');
    if (sir.length < 32) {
        throw new Error('OTURUM_SIRRI ortam değişkeni eksik veya 32 karakterden kısa.');
    }
    return sir;
}

/**
 * GIRIS_KULLANICILAR ortam değişkeni: tools/sifre-olustur.mjs ile üretilen JSON dizisi.
 * [{ "isim": "...", "email": "...", "salt": "hex", "hash": "hex" }, ...]
 */
function kullaniciListesiOku() {
    const ham = ortamDegeri('GIRIS_KULLANICILAR');
    if (!ham) return { liste: [], hata: 'eksik' };
    try {
        const liste = JSON.parse(ham);
        if (!Array.isArray(liste)) return { liste: [], hata: 'gecersiz' };
        const gecerli = liste.filter((k) => k && typeof k.isim === 'string'
            && /^[0-9a-f]{32}$/i.test(k.salt) && /^[0-9a-f]{64}$/i.test(k.hash));
        return { liste: gecerli, hata: gecerli.length ? null : 'hashsiz' };
    } catch {
        return { liste: [], hata: 'gecersiz' };
    }
}

function kullanicilar() {
    return kullaniciListesiOku().liste;
}

/** Giriş ayarlarında eksik ne var? Değerleri asla göstermez; yalnızca durumu söyler. */
export function girisAyarSorunu() {
    const { hata } = kullaniciListesiOku();
    const sorunlar = [];
    if (hata === 'eksik') sorunlar.push('Vercel\'de GIRIS_KULLANICILAR ayarı bulunamadı');
    if (hata === 'gecersiz') sorunlar.push('GIRIS_KULLANICILAR ayarı okunamadı (değer [{ ile başlayıp }] ile bitmeli)');
    if (hata === 'hashsiz') sorunlar.push('GIRIS_KULLANICILAR ayarında "salt" ve "hash" yok (açık şifre değil, üretilen değer yapıştırılmalı)');
    if (ortamDegeri('OTURUM_SIRRI').length < 32) sorunlar.push('Vercel\'de OTURUM_SIRRI ayarı bulunamadı veya çok kısa');
    return sorunlar.length ? `Giriş sistemi ayarlanmamış: ${sorunlar.join('; ')}. Ayarlardan sonra Redeploy yapılmalı.` : null;
}

export async function sifreHashle(sifre, saltHex) {
    const hash = await pbkdf2Async(sifre, Buffer.from(saltHex, 'hex'), SIFRE_ITERASYON, 32, 'sha256');
    return hash.toString('hex');
}

function esitMi(a, b) {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Kullanıcı adı veya e-posta + şifre doğruysa kullanıcıyı, değilse null döner. */
export async function kullaniciDogrula(kimlik, sifre) {
    const aranan = String(kimlik || '').trim().toLocaleLowerCase('tr');
    const kullanici = kullanicilar().find(
        (k) => String(k.isim || '').toLocaleLowerCase('tr') === aranan
            || String(k.email || '').toLocaleLowerCase('tr') === aranan,
    );

    // Kullanıcı yoksa da hash hesaplanır; böylece yanıt süresinden kullanıcı adının var olup olmadığı anlaşılmaz.
    const salt = kullanici ? kullanici.salt : randomBytes(16).toString('hex');
    const hesaplanan = await sifreHashle(String(sifre || ''), salt);

    if (kullanici && esitMi(hesaplanan, kullanici.hash)) {
        return { isim: kullanici.isim };
    }
    return null;
}

function imzala(veri) {
    return createHmac('sha256', oturumSirri()).update(veri).digest('base64url');
}

function cerezAyarla(res, deger, saniye) {
    // Yayında çerez yalnızca HTTPS ile gönderilir; yerel geliştirmede (http://127.0.0.1) Secure olmadan.
    const guvenli = process.env.YEREL_GELISTIRME === '1' ? '' : '; Secure';
    res.setHeader('Set-Cookie', [
        `${OTURUM_CEREZI}=${deger}; Path=/; Max-Age=${saniye}; HttpOnly${guvenli}; SameSite=Lax`,
    ]);
}

export function kullaniciSayisi() {
    return kullanicilar().length;
}

export function oturumAc(res, isim) {
    const yuk = Buffer.from(JSON.stringify({ isim, bitis: Date.now() + OTURUM_SURESI_SN * 1000 })).toString('base64url');
    cerezAyarla(res, `${yuk}.${imzala(yuk)}`, OTURUM_SURESI_SN);
}

export function oturumKapat(res) {
    cerezAyarla(res, '', 0);
}

/** Geçerli bir oturum çerezi varsa { isim } döner, yoksa null. */
export function oturumOku(req) {
    const cerezler = String(req.headers.cookie || '').split(';');
    const ham = cerezler
        .map((c) => c.trim())
        .find((c) => c.startsWith(`${OTURUM_CEREZI}=`));
    if (!ham) {
        return null;
    }

    const [yuk, imza] = ham.slice(OTURUM_CEREZI.length + 1).split('.');
    if (!yuk || !imza || !esitMi(imza, imzala(yuk))) {
        return null;
    }

    try {
        const veri = JSON.parse(Buffer.from(yuk, 'base64url').toString('utf8'));
        if (typeof veri.bitis !== 'number' || veri.bitis < Date.now()) {
            return null;
        }
        return { isim: String(veri.isim) };
    } catch {
        return null;
    }
}

export function onbellekYok(res) {
    res.setHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    res.setHeader('X-Content-Type-Options', 'nosniff');
}
