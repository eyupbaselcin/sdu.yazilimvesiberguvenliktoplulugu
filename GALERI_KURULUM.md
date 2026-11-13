# Yönetici girişi ve özel fotoğraf galerisi (Vercel)

Giriş ve galeri, `api/` klasöründeki JavaScript sunucu fonksiyonlarıyla çalışır. Şifreler ve fotoğraflar tarayıcıya hiç gönderilmez; sunucu şifreyi kontrol eder ve yalnızca giriş yapmış kişiye fotoğrafları verir.

| Dosya | Görevi |
| --- | --- |
| `api/giris.js` | E-posta + şifreyi **Firebase Authentication** ile doğrular, 8 saatlik oturum açar |
| `api/oturum.js` | Giriş yapılmış mı kontrol eder |
| `api/cikis.js` | Oturumu kapatır |
| `api/galeri.js`, `api/galeri-gorsel.js` | Galeri listesi ve fotoğraflar (yalnızca giriş yapanlara) |
| `api/etkinlikler.js` | Etkinlik listesi (herkese) ve ekleme/düzenleme/silme (yalnızca yöneticiye) |
| `api/_github.js` | Panelden yapılan değişiklikleri GitHub deposuna commit eder |
| `public/scripts/yonetim.js` | Kontrol masası paneli |
| `pages/giris.html` | Giriş ekranı ve yönetici paneli |
| `pages/galeri.html` | Galeri sayfası (panelde "Özel Galeri" düğmesi) |
| `galeri-private/images/` | Galeri fotoğrafları. Sitede herkese açık değildir |

## 1. Giriş: Firebase (bir kez)

1. [Firebase konsolu](https://console.firebase.google.com) → **toplulukadmin** projesi → **Authentication** → **Başlayın**.
2. **Sign-in method** sekmesinde **E-posta/Şifre** yöntemini açın.
3. **Users** sekmesinde **Kullanıcı ekle** ile her yönetici için e-posta ve şifre oluşturun.
4. **Proje ayarları** (dişli simgesi) → **Genel** → **Web API anahtarı** değerini kopyalayın.
5. Vercel'de **Project → Settings → Environment Variables** bölümüne ekleyin:

   | Ad | Değer |
   | --- | --- |
   | `FIREBASE_API_KEY` | 4. adımda kopyalanan anahtar |
   | `YONETICI_EPOSTALAR` | Panele girebilecek e-postalar, virgülle ayrılmış |
   | `OTURUM_SIRRI` | Zaten var; değiştirmeyin |

6. **Deployments → Redeploy**.

Şifreler Firebase'de durur; ne bu depoda ne Vercel'de saklanır. Şifre değiştirmek, kullanıcı silmek veya
devre dışı bırakmak Firebase → Authentication → Users ekranından yapılır. Firebase'de hesabı olsa bile e-postası
`YONETICI_EPOSTALAR` listesinde olmayan kişi panele giremez. Eski `GIRIS_KULLANICILAR` ayarı artık kullanılmıyor; Vercel'den silinebilir.

## 2. Etkinlik ve afiş kaydı: GitHub (bir kez)

Panelden eklenen/düzenlenen/silinen etkinlikler `public/data/etkinlikler.json` dosyasına, yüklenen afişler
`public/assets/images/etkinlikler/` klasörüne **GitHub'a commit olarak** yazılır. Vercel her commit'te siteyi
yeniden yayınlar; değişikliğin sitede görünmesi yaklaşık 1 dakika sürer. Her değişiklik GitHub geçmişinde
durduğu için yanlışlıkla silinen bir etkinlik veya afiş oradan geri alınabilir.

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access**: *Only select repositories* → `sdu.yazilimvesiberguvenliktoplulugu`.
3. **Permissions → Repository permissions → Contents**: *Read and write*. Başka izin vermeyin.
4. Oluşan token'ı Vercel'e `GITHUB_TOKEN` adıyla ekleyin ve **Redeploy** yapın.

Token'ın süresi dolunca panel "GitHub kaydı reddetti" der; yeni token oluşturup Vercel'deki değeri güncelleyin.
Panelden bir değişiklik yaptıktan sonra bilgisayarda çalışmaya devam etmeden önce `git pull` yapın.

## Kayıt formu ve yanıtlar

Kayıt formu tanımı ve yanıtlar kişisel veri içerdiği için GitHub'a yazılmaz; **Vercel Blob** deposunda saklanır.
Vercel → **Storage** → **Create Database** → **Blob** → bu projeye bağlayın (**Connect**) ve **Redeploy** yapın.
Blob kurulana kadar kayıtlar yalnızca EmailJS üzerinden e-postayla gelir.

## Fotoğraf eklemek

Fotoğrafları (JPG, PNG, GIF, WEBP) `galeri-private/images/` klasörüne koyup projeyi yeniden yayınlayın. `vercel.json` bu klasörü yalnızca galeri fonksiyonlarına dahil eder; doğrudan bir adresten açılamaz.

## Local'de denemek

`npm run dev`, `api/` fonksiyonlarını da çalıştırır. Ayarları proje klasöründeki `.env.local` dosyasına
(`FIREBASE_API_KEY=...` biçiminde) yazın; bu dosya GitHub'a yüklenmez. `.env.local`'e `GITHUB_TOKEN` eklenirse
yerelde panelden yapılan değişiklikler de gerçek depoya yazılır.

Tarayıcılar ekran görüntüsü alınmasını engelleyemez; giriş yapan biri fotoğrafı kaydedebilir.
