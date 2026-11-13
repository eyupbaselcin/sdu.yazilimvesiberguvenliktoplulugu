// Vercel sunucu fonksiyonlarının ortak kodu. "_" ile başladığı için Vercel bunu ayrı bir adres olarak yayınlamaz.
import { createHmac, timingSafeEqual } from 'node:crypto';

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

/** Firebase projesinin Web API anahtarı (Firebase konsolu > Proje ayarları > Genel). */
const firebaseAnahtari = () => ortamDegeri('FIREBASE_API_KEY');

/** Panele girebilecek e-postalar (virgülle ayrılmış). Firebase'de hesabı olan herkes giremesin diye zorunlu. */
function yoneticiEpostalari() {
    return ortamDegeri('YONETICI_EPOSTALAR')
        .split(/[,;\s]+/)
        .map((e) => e.trim().toLocaleLowerCase('tr'))
        .filter(Boolean);
}

/** Giriş ayarlarında eksik ne var? Değerleri asla göstermez; yalnızca durumu söyler. */
export function girisAyarSorunu() {
    const sorunlar = [];
    if (!firebaseAnahtari()) sorunlar.push("Vercel'de FIREBASE_API_KEY ayarı bulunamadı");
    if (!yoneticiEpostalari().length) sorunlar.push("Vercel'de YONETICI_EPOSTALAR ayarı bulunamadı");
    if (ortamDegeri('OTURUM_SIRRI').length < 32) sorunlar.push("Vercel'de OTURUM_SIRRI ayarı bulunamadı veya çok kısa");
    return sorunlar.length ? `Giriş sistemi ayarlanmamış: ${sorunlar.join('; ')}. Ayarlardan sonra Redeploy yapılmalı.` : null;
}

export class GirisHatasi extends Error {
    constructor(kod, mesaj) {
        super(mesaj);
        this.kod = kod;
    }
}

const FIREBASE_HATALARI = {
    INVALID_LOGIN_CREDENTIALS: 'E-posta veya şifre hatalı.',
    INVALID_PASSWORD: 'E-posta veya şifre hatalı.',
    EMAIL_NOT_FOUND: 'E-posta veya şifre hatalı.',
    INVALID_EMAIL: 'Geçerli bir e-posta adresi girin.',
    USER_DISABLED: "Bu hesap Firebase'de devre dışı bırakılmış.",
    OPERATION_NOT_ALLOWED: "Firebase'de E-posta/Şifre giriş yöntemi açık değil (Authentication > Sign-in method).",
};

/**
 * E-posta + şifreyi Firebase Authentication ile doğrular.
 * Doğruysa ve e-posta yönetici listesindeyse { isim } döner; değilse GirisHatasi fırlatır.
 */
export async function kullaniciDogrula(eposta, sifre) {
    const yanit = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseAnahtari())}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: eposta, password: sifre, returnSecureToken: true }),
        },
    );
    const veri = await yanit.json().catch(() => ({}));

    if (!yanit.ok) {
        const kod = String(veri?.error?.message || '').split(/[ :]/)[0];
        if (kod === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
            throw new GirisHatasi(429, 'Çok fazla hatalı deneme yapıldı. Birkaç dakika sonra tekrar deneyin.');
        }
        if (FIREBASE_HATALARI[kod]) throw new GirisHatasi(kod.startsWith('INVALID') || kod === 'EMAIL_NOT_FOUND' ? 401 : 403, FIREBASE_HATALARI[kod]);
        if (/API key not valid|API_KEY_INVALID/i.test(String(veri?.error?.message))) {
            throw new GirisHatasi(503, "Vercel'deki FIREBASE_API_KEY geçersiz.");
        }
        console.error('Firebase giriş hatası:', veri?.error?.message || yanit.status);
        throw new GirisHatasi(502, "Firebase'e ulaşılamadı. Lütfen tekrar deneyin.");
    }

    const dogrulanan = String(veri.email || '').toLocaleLowerCase('tr');
    if (!yoneticiEpostalari().includes(dogrulanan)) {
        throw new GirisHatasi(403, 'Bu hesabın yönetim paneline erişim izni yok.');
    }
    const isim = String(veri.displayName || '').trim() || dogrulanan.split('@')[0];
    return { isim: isim.slice(0, 60) };
}

function esitMi(a, b) {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ab.length === bb.length && timingSafeEqual(ab, bb);
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
