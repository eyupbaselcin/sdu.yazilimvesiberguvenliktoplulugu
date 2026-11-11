# Yönetici girişi ve özel fotoğraf galerisi (Vercel)

Giriş ve galeri, `api/` klasöründeki JavaScript sunucu fonksiyonlarıyla çalışır. Şifreler ve fotoğraflar tarayıcıya hiç gönderilmez; sunucu şifreyi kontrol eder ve yalnızca giriş yapmış kişiye fotoğrafları verir.

| Dosya | Görevi |
| --- | --- |
| `api/giris.js` | Kullanıcı adı/e-posta + şifreyi doğrular, 8 saatlik oturum açar |
| `api/oturum.js` | Giriş yapılmış mı kontrol eder |
| `api/cikis.js` | Oturumu kapatır |
| `api/galeri.js`, `api/galeri-gorsel.js` | Galeri listesi ve fotoğraflar (yalnızca giriş yapanlara) |
| `api/etkinlikler.js` | Etkinlik listesi (herkese) ve ekleme/düzenleme/silme (yalnızca yöneticiye) |
| `public/scripts/yonetim.js` | Kontrol masası paneli |
| `pages/giris.html` | Giriş ekranı ve yönetici paneli |
| `pages/galeri.html` | Galeri sayfası (panelde "Özel Galeri" düğmesi) |
| `galeri-private/images/` | Galeri fotoğrafları. Sitede herkese açık değildir |
| `tools/sifre-olustur.mjs` | Şifre hash'i üretme aracı |

## Kurulum (bir kez)

1. Bilgisayarda proje klasöründe çalıştırın ve her yönetici için kullanıcı adı, e-posta ve **yeni** bir şifre girin:

   ```sh
   node tools/sifre-olustur.mjs
   ```

2. Araç iki değer basar. Vercel'de **Project → Settings → Environment Variables** bölümüne ikisini de ekleyin:
   - `GIRIS_KULLANICILAR`
   - `OTURUM_SIRRI`
3. **Deployments → Redeploy** ile yeniden yayınlayın.

Şifreler hiçbir dosyada tutulmaz; Vercel'de yalnızca geri çevrilemeyen hash'leri durur. Kullanıcı eklemek veya şifre değiştirmek için aracı yeniden çalıştırıp `GIRIS_KULLANICILAR` değerini güncelleyin. `OTURUM_SIRRI`'ni değiştirmek herkesin oturumunu kapatır.

## Etkinlik yönetimi (Kontrol masası)

Giriş yapınca açılan panelde etkinlikler eklenir, düzenlenir ve silinir; değişiklikler Etkinlikler sayfasında herkese görünür. Veriler ve afişler **Vercel Blob** deposunda saklanır.

Kurulum (bir kez):

1. Vercel'de projeyi açın → **Storage** → **Create Database** → **Blob** → oluşturup bu projeye bağlayın (**Connect**).
2. Bu işlem `BLOB_READ_WRITE_TOKEN` ortam değişkenini otomatik ekler. **Deployments → Redeploy** ile yeniden yayınlayın.

Depo kurulana kadar Etkinlikler sayfası `public/data/etkinlikler.json` dosyasındaki etkinlikleri gösterir; panelde kaydetmeye çalışınca "Etkinlik deposu kurulmamış" uyarısı çıkar. İlk kayıttan sonra liste depodan okunur ve bu dosya artık kullanılmaz.

Her değişiklikte listenin yeni bir sürümü kaydedilir; son 10 sürüm Vercel → Storage → Blob → `etkinlikler/` klasöründe durur. Yanlışlıkla silinen bir etkinlik oradan geri getirilebilir.

## Fotoğraf eklemek

Fotoğrafları (JPG, PNG, GIF, WEBP) `galeri-private/images/` klasörüne koyup projeyi yeniden yayınlayın. `vercel.json` bu klasörü yalnızca galeri fonksiyonlarına dahil eder; doğrudan bir adresten açılamaz.

## Local'de denemek

`npm run dev` yalnızca sayfaları açar, `api/` fonksiyonlarını çalıştırmaz. Giriş ve galeriyi bilgisayarda denemek için `npx vercel dev` kullanın.

Tarayıcılar ekran görüntüsü alınmasını engelleyemez; giriş yapan biri fotoğrafı kaydedebilir.
