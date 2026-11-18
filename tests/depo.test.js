import { test, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const dosyalar = new Map();
let surumNo = 0;
let bozukOkuma = false;
class BlobError extends Error {}
class BlobPreconditionFailedError extends BlobError {}
mock.module('@vercel/blob', {
    namedExports: {
        BlobError,
        BlobPreconditionFailedError,
        async list({ prefix = '', cursor, limit = 1000 } = {}) {
            const hepsi = [...dosyalar.values()].filter((b) => b.pathname.startsWith(prefix));
            const bas = Number(cursor || 0);
            const blobs = hepsi.slice(bas, bas + limit);
            return { blobs, hasMore: bas + limit < hepsi.length, cursor: String(bas + limit) };
        },
        async get(yol, options) {
            assert.equal(options.useCache, false);
            if (bozukOkuma) throw new Error('Simulated read failure');
            const b = dosyalar.get(yol);
            return b ? { statusCode: 200, blob: b, stream: new Response(b.metin).body } : null;
        },
        async put(yol, metin, options) {
            assert.equal(options.access, 'private');
            const eski = dosyalar.get(yol);
            if (options.ifMatch && eski?.etag !== options.ifMatch) throw new BlobPreconditionFailedError('ETag mismatch');
            if (eski && !options.ifMatch && !options.allowOverwrite) throw new BlobError('Vercel Blob: This blob already exists');
            const b = { pathname: yol, url: yol, metin, uploadedAt: new Date(), etag: `v${++surumNo}` };
            dosyalar.set(yol, b);
            return b;
        },
        async del(yol) { dosyalar.delete(yol); },
    },
});
const depo = await import('../api/_depo.js');
const { formuOku } = await import('../api/form.js');
const { default: handler, cevapDogrula } = await import('../api/yanitlar.js');
const { oturumAc, oturumOku } = await import('../api/_ortak.js');

beforeEach(() => {
    dosyalar.clear();
    bozukOkuma = false;
    process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
    process.env.OTURUM_SIRRI = 'test-only-secret-with-at-least-32-characters';
    process.env.YONETICI_EPOSTALAR = 'admin@example.org';
    delete process.env.TURNSTILE_SECRET_KEY;
    delete process.env.TURNSTILE_SITE_KEY;
});

function cevap() {
    return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; },
        status(k) { this.statusCode = k; return this; }, json(v) { this.body = v; return this; } };
}

test('Zorunlu alanlar temizlendikten sonra boş bırakılamaz', () => {
    for (const ham of ['   ', '\u0000', {}, 42]) {
        assert.throws(() => cevapDogrula({ baslik: 'Ad', tur: 'kisa', zorunlu: true }, ham), { kod: 422 });
    }
    assert.throws(() => cevapDogrula({ baslik: 'Seçim', tur: 'coklu', zorunlu: true, secenekler: ['A', 'B'] }, [42]), { kod: 422 });
    assert.equal(cevapDogrula({ baslik: 'Ad', tur: 'kisa', zorunlu: true }, ' Ali '), 'Ali');
});

test('OIDC ile bağlı depo da kurulu sayılır', () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.BLOB_STORE_ID = 'test-store';
    process.env.VERCEL_OIDC_TOKEN = 'test-oidc';
    assert.equal(depo.depoKuruluMu(), true);
    delete process.env.BLOB_STORE_ID;
    delete process.env.VERCEL_OIDC_TOKEN;
    assert.equal(depo.depoKuruluMu(), false);
});

test('CAS eski form güncellemesini reddeder; aktif sürümü bozmaz', async () => {
    await depo.surumYaz('form/tanim-', { surum: 'bir' }, null);
    const ilk = await depo.sonSurumuOku('form/tanim-');
    await depo.surumYaz('form/tanim-', { surum: 'iki' }, ilk.etag);
    await assert.rejects(depo.surumYaz('form/tanim-', { surum: 'uc' }, ilk.etag), { kod: 409 });
    assert.equal((await depo.sonSurumuOku('form/tanim-')).veri.surum, 'iki');
});

test('Eski sürümler ilk liste sayfasıyla sınırlı okunmaz', async () => {
    for (let i = 0; i < 1005; i++) {
        const yol = `form/tanim-${i}.json`;
        dosyalar.set(yol, { pathname: yol, url: yol, uploadedAt: new Date(i * 1000), metin: JSON.stringify({ i }) });
    }
    assert.equal((await depo.sonSurumuOku('form/tanim-')).veri.i, 1004);
});

test('Tekrarlanan başvuru bir kez saklanır; farklı içerik ezemez', async () => {
    const { form } = await formuOku();
    const req = { method: 'POST', headers: {}, query: {}, body: {
        surum: form.surum, istekId: 'a'.repeat(32),
        cevaplar: { ad_soyad: 'Ali', sinif: '1. Sınıf', telefon: '05551234567', eposta: 'ali@example.org' },
    } };
    for (let i = 0; i < 2; i++) {
        const res = cevap();
        await handler(req, res);
        assert.equal(res.statusCode, 201);
    }
    assert.equal(dosyalar.size, 1);
    req.body.cevaplar.ad_soyad = 'Başka';
    const res = cevap();
    await handler(req, res);
    assert.equal(res.statusCode, 409);
});

test('Form sürümü değişmişse başvuru saklanmaz', async () => {
    const res = cevap();
    await handler({ method: 'POST', headers: {}, body: { surum: 'eski' } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(dosyalar.size, 0);
});

test('Yönetici listesinden çıkarılan kişi mevcut çerezle erişemez', () => {
    const res = cevap();
    oturumAc(res, 'Admin', 'admin@example.org');
    const req = { headers: { cookie: res.headers['Set-Cookie'][0].split(';')[0] } };
    assert.ok(oturumOku(req));
    process.env.YONETICI_EPOSTALAR = 'baska@example.org';
    assert.equal(oturumOku(req), null);
});

test('Yanıt okuma hatası eksik listeyi başarı gibi göstermez', async () => {
    dosyalar.set('yanitlar/a.json', { pathname: 'yanitlar/a.json', url: 'yanitlar/a.json' });
    bozukOkuma = true;
    const session = cevap();
    oturumAc(session, 'Admin', 'admin@example.org');
    const res = cevap();
    const sustur = mock.method(console, 'error', () => {});
    try {
        await handler({ method: 'GET', query: {}, headers: { cookie: session.headers['Set-Cookie'][0].split(';')[0] } }, res);
    } finally { sustur.mock.restore(); }
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.yanitlar, undefined);
});

test('Yönetici yanıtları cursor ile sayfalanır; izinsiz erişim reddedilir', async () => {
    for (let i = 0; i < 105; i++) {
        const yol = `yanitlar/${i}.json`;
        dosyalar.set(yol, { pathname: yol, url: yol, metin: JSON.stringify({ id: i }) });
    }
    const izinsiz = cevap();
    await handler({ method: 'GET', headers: {}, query: {} }, izinsiz);
    assert.equal(izinsiz.statusCode, 401);
    const session = cevap();
    oturumAc(session, 'Admin', 'admin@example.org');
    const headers = { cookie: session.headers['Set-Cookie'][0].split(';')[0] };
    const ilk = cevap();
    await handler({ method: 'GET', headers, query: {} }, ilk);
    assert.equal(ilk.body.yanitlar.length, 100);
    const ikinci = cevap();
    await handler({ method: 'GET', headers, query: { cursor: ilk.body.cursor } }, ikinci);
    assert.equal(ikinci.body.yanitlar.length, 5);
    assert.equal(ikinci.body.cursor, null);
});

test('CAPTCHA eksik ayar veya token ile atlanamaz', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const eksik = cevap();
    await handler({ method: 'POST', headers: {}, body: {} }, eksik);
    assert.equal(eksik.statusCode, 503);
    process.env.TURNSTILE_SITE_KEY = 'test-site';
    const tokensiz = cevap();
    await handler({ method: 'POST', headers: {}, body: {} }, tokensiz);
    assert.equal(tokensiz.statusCode, 422);
    assert.equal(dosyalar.size, 0);
});
