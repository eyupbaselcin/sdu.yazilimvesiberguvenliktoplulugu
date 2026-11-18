import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const kaynak = await readFile(new URL('../public/scripts/kayit-formu.js', import.meta.url), 'utf8');
const gonderim = kaynak.slice(kaynak.indexOf("form.addEventListener('submit'"), kaynak.indexOf('\n    formuYukle();'));

function ortam(basarili) {
    const durum = { eposta: 0, tesekkur: 0 };
    const scope = {
        Error, Date, JSON, Promise,
        console: { warn() {} },
        tanim: { acik: true, surum: 'v1' },
        captchaGerekli: false,
        istekId: 'a'.repeat(32),
        gonderButonu: { disabled: false },
        cevaplariTopla: () => ({ ad_soyad: 'Ali' }),
        mesajYaz: (metin) => { durum.mesaj = metin; },
        el: () => ({}),
        ilkCevap: () => 'Ali',
        epostaMetni: () => 'Başvuru',
        EMAILJS_SERVIS: 'test',
        EMAILJS_SABLON: 'test',
        window: { emailjs: { send() { durum.eposta++; return Promise.resolve(); } } },
        form: {
            elements: { web_sitesi: { value: '' } },
            addEventListener(ad, fn) { durum.gonder = fn; },
            replaceWith() { durum.tesekkur++; },
        },
        fetch: async (url, options) => {
            durum.govde = JSON.parse(options.body);
            return { ok: basarili, status: basarili ? 201 : 503,
                json: async () => basarili ? { basarili: true } : { mesaj: 'Depo kullanılamıyor.' } };
        },
    };
    vm.runInNewContext(gonderim, scope);
    return { durum, scope };
}

test('Sunucu kaydetmezse EmailJS başarılı olabilecek olsa bile başarı gösterilmez', async () => {
    const { durum, scope } = ortam(false);
    await durum.gonder({ preventDefault() {} });
    assert.equal(durum.tesekkur, 0);
    assert.equal(durum.eposta, 0);
    assert.equal(durum.mesaj, 'Depo kullanılamıyor.');
    assert.equal(scope.gonderButonu.disabled, false);
});

test('Kalıcı kayıt sonrası bildirim ve başarı gösterilir; sürüm ve tekrar anahtarı gönderilir', async () => {
    const { durum } = ortam(true);
    await durum.gonder({ preventDefault() {} });
    assert.equal(durum.tesekkur, 1);
    assert.equal(durum.eposta, 1);
    assert.equal(durum.govde.surum, 'v1');
    assert.equal(durum.govde.istekId, 'a'.repeat(32));
});

test('E-posta kütüphanesi hata atsa da kalıcı kayıt başarısı bozulmaz', async () => {
    const { durum, scope } = ortam(true);
    scope.window.emailjs.send = () => { throw new Error('EmailJS kullanılamıyor'); };
    await durum.gonder({ preventDefault() {} });
    assert.equal(durum.tesekkur, 1);
    assert.equal(durum.mesaj, '');
});
