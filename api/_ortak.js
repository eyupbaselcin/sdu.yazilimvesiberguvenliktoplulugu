// Vercel sunucu fonksiyonlarının ortak kodu. "_" ile başladığı için Vercel bunu ayrı bir adres olarak yayınlamaz.
import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const pbkdf2Async = promisify(pbkdf2);

export const SIFRE_ITERASYON = 600000;
const OTURUM_CEREZI = 'ysgt_oturum';
const OTURUM_SURESI_SN = 8 * 60 * 60; // 8 saat

function oturumSirri() {
    const sir = process.env.OTURUM_SIRRI;
    if (!sir || sir.length < 32) {
        throw new Error('OTURUM_SIRRI ortam değişkeni eksik veya 32 karakterden kısa.');
    }
    return sir;
}

/**
 * GIRIS_KULLANICILAR ortam değişkeni: tools/sifre-olustur.mjs ile üretilen JSON dizisi.
 * [{ "isim": "...", "email": "...", "salt": "hex", "hash": "hex" }, ...]
 */
function kullanicilar() {
    try {
        const liste = JSON.parse(process.env.GIRIS_KULLANICILAR || '[]');
        return Array.isArray(liste) ? liste : [];
    } catch {
        return [];
    }
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
