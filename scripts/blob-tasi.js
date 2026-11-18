// Eski public depodan private depoya KOPYALAR; kaynak veriyi asla silmez.
import { BlobError, get, list, put } from '@vercel/blob';

const kaynak = process.env.ESKI_BLOB_READ_WRITE_TOKEN;
const hedef = process.env.BLOB_READ_WRITE_TOKEN;
if (!kaynak || !hedef || kaynak === hedef) {
    throw new Error('Farklı kaynak ve hedef token gerekli: ESKI_BLOB_READ_WRITE_TOKEN ve BLOB_READ_WRITE_TOKEN.');
}
const yaz = process.argv.includes('--copy');
let adet = 0;
let aktifForm;
async function kaynakOku(blob) {
    const sonuc = await get(blob.url, { access: 'public', token: kaynak });
    if (!sonuc || sonuc.statusCode !== 200) throw new Error('Kaynak kayıt okunamadı; işlem durduruldu.');
    const metin = await new Response(sonuc.stream).text();
    JSON.parse(metin);
    return metin;
}
async function hedefeYaz(yol, metin) {
    try {
        await put(yol, metin, {
            token: hedef, access: 'private', contentType: 'application/json',
            addRandomSuffix: false, allowOverwrite: false,
        });
    } catch (hata) {
        if (!(hata instanceof BlobError) || !/already exists/i.test(hata.message)) throw hata;
        const mevcut = await get(yol, { token: hedef, access: 'private', useCache: false });
        if (!mevcut || await new Response(mevcut.stream).text() !== metin) {
            throw new Error('Hedefte farklı içerik var; üzerine yazılmadı.');
        }
    }
}
for (const prefix of ['form/', 'yanitlar/']) {
    let cursor;
    do {
        const sayfa = await list({ prefix, cursor, token: kaynak });
        for (const blob of sayfa.blobs) {
            // Kopyalama zamanı eski sürümlerin sırasını değiştirmesin.
            if (blob.pathname.startsWith('form/tanim-')
                && (!aktifForm || blob.pathname === 'form/tanim-guncel.json'
                    || (aktifForm.pathname !== 'form/tanim-guncel.json' && new Date(blob.uploadedAt) > new Date(aktifForm.uploadedAt)))) {
                aktifForm = blob;
            }
            if (yaz) {
                await hedefeYaz(blob.pathname, await kaynakOku(blob));
            }
            adet += 1;
        }
        cursor = sayfa.hasMore ? sayfa.cursor : undefined;
    } while (cursor);
}
if (yaz && aktifForm) {
    await hedefeYaz('form/tanim-guncel.json', await kaynakOku(aktifForm));
}
console.log(`${adet} JSON dosyası ${yaz ? 'kopyalandı/doğrulandı' : 'bulundu (dry-run, değişiklik yapılmadı)'}. Kaynak dosyalar silinmedi.`);
