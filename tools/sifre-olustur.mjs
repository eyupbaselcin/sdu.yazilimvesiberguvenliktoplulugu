// Kullanım:  node tools/sifre-olustur.mjs
// Yönetici kullanıcılarını sorar ve Vercel'e girilecek iki ortam değişkenini üretir.
// Şifreler hiçbir dosyaya yazılmaz; yalnızca geri çevrilemeyen hash'leri ekrana ve .env.local'e yazılır.
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sifreHashle } from '../api/_ortak.js';

const rl = createInterface({ input: stdin, output: stdout });
const kullanicilar = [];

console.log('Yönetici kullanıcılarını girin. Bitirmek için kullanıcı adını boş bırakıp Enter\'a basın.\n');

while (true) {
    const isim = (await rl.question('Kullanıcı adı: ')).trim();
    if (!isim) break;
    const email = (await rl.question('E-posta: ')).trim();
    if (/['"\\]/.test(isim + email)) {
        console.log('  Kullanıcı adı ve e-posta tırnak veya ters bölü içeremez, bu kullanıcı atlandı.\n');
        continue;
    }
    const sifre = await rl.question('Şifre (en az 10 karakter): ');
    if (sifre.length < 10) {
        console.log('  Şifre çok kısa, bu kullanıcı atlandı.\n');
        continue;
    }
    const salt = randomBytes(16).toString('hex');
    kullanicilar.push({ isim, email, salt, hash: await sifreHashle(sifre, salt) });
    console.log('  Eklendi.\n');
}
rl.close();

if (!kullanicilar.length) {
    console.log('Hiç kullanıcı eklenmedi.');
    process.exit(0);
}

const kullaniciDegeri = JSON.stringify(kullanicilar);
const oturumSirri = randomBytes(48).toString('base64url');

// Yerel geliştirme (npm run dev) için .env.local dosyasına yaz. Bu dosya git'e gönderilmez.
const envYolu = fileURLToPath(new URL('../.env.local', import.meta.url));
const eskiSatirlar = existsSync(envYolu)
    ? readFileSync(envYolu, 'utf8').split(/\r?\n/).filter((s) => s && !/^(GIRIS_KULLANICILAR|OTURUM_SIRRI)=/.test(s))
    : [];
writeFileSync(envYolu, [...eskiSatirlar, `GIRIS_KULLANICILAR='${kullaniciDegeri}'`, `OTURUM_SIRRI=${oturumSirri}`, ''].join('\n'));
console.log('\n✓ Yerel ayarlar .env.local dosyasına kaydedildi. "npm run dev" sunucusunu kapatıp yeniden başlatın.\n');

console.log('Yayındaki site için Vercel → Project → Settings → Environment Variables bölümüne şu ikisini ekleyin:\n');
console.log('Ad:    GIRIS_KULLANICILAR');
console.log('Değer: ' + kullaniciDegeri + '\n');
console.log('Ad:    OTURUM_SIRRI');
console.log('Değer: ' + oturumSirri + '\n');
console.log('Sonra projeyi yeniden deploy edin (Deployments → Redeploy).');
