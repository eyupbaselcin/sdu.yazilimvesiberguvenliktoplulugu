# Eğitim kayıt formu

"Eğitim Kaydı" sayfası (`pages/egitim-kayit.html`) Google Forms gibi çalışır: başlığı, açıklamaları ve soruları yöneticiler panelden değiştirir, yanıtlar panelde görülür ve Excel'e indirilir.

## Yönetim paneli

Giriş sayfasından yönetici olarak girin. Panelde üç sekme var:

- **Etkinlikler**: etkinlik ekleme/düzenleme/silme.
- **Kayıt formu**: üst başlık, form başlığı, uyarı kutusu, açıklama maddeleri ve sorular.
  - Soru türleri: Kısa yanıt, Paragraf, E-posta, Telefon, Çoktan seçmeli (tek), Onay kutuları (çoklu).
  - Her soru zorunlu yapılabilir, yukarı/aşağı taşınabilir, kopyalanabilir, silinebilir.
  - **Yanıt kabul ediliyor** işareti kaldırılırsa form kapanır; sayfada "yanıt kabul etmiyor" yazar.
   - Değişiklikler **Formu kaydet** ile yayına girer. Form geçmişi korunur; eşzamanlı değişiklikler ETag ile denetlenir.
- **Yanıtlar**: tüm kayıtlar tablo halinde, en yeni üstte. Arama, tek tek silme ve **Excel (CSV) indir**.

Soruları değiştirmek eski yanıtları bozmaz: her yanıt, gönderildiği andaki soru metinleriyle saklanır. Silinen bir sorunun eski cevapları da tabloda ve Excel dosyasında görünmeye devam eder.

## Kayıtlar nerede saklanır

Başarı mesajı yalnızca sunucu kalıcı kaydı onayladığında gösterilir:

1. **Sunucu (Private Vercel Blob)**: `api/yanitlar.js`. Her yanıt özel erişimli JSON dosyasıdır. Aynı gönderim kimliğiyle tekrarlanan istek ikinci kayıt oluşturmaz. Yanıtlar yalnızca yönetici API'sinden okunabilir.
2. **E-posta (EmailJS)**: kalıcı kayıt başarılı olduktan sonra tarayıcıdan gönderilen, en iyi gayretli bildirimdir. E-posta hatası kaydı silmez; e-posta tek başına başarılı kayıt sayılmaz.

Sunucu her cevabı formdaki sorulara göre yeniden kontrol eder (zorunlu alanlar, seçenek listesi, e-posta ve telefon biçimi). Listede olmayan alanlar kaydedilmez.

## Kurulum

Etkinlikler GitHub'da, başvurular **ayrı bir Private Blob deposunda** tutulur. SQL veritabanı veya Firestore kurulması gerekmez.

1. Vercel → proje → Storage → Blob oluşturun, erişimi **Private** seçin.
2. Depoyu projeye bağlayın. Production ve Preview bağlantılarını kontrol edin. Yerel geliştirme için ayrı bir Development deposu kullanın; gerçek başvuruları deneme ortamında kullanmayın.
3. SDK iki bağlantı yöntemini destekler:
   - `BLOB_STORE_ID` + Vercel'in yönettiği `VERCEL_OIDC_TOKEN` (OIDC).
   - Alternatif olarak bağlantıda **Add a read-write token env var** seçeneğini açıp `BLOB_READ_WRITE_TOKEN` ekleyin.
4. **Redeploy** yapın. Eski deployment yeni ortam değişkenlerini otomatik almaz.
5. Yönetici girişi yapın, aynı tarayıcıda `/api/depo-durum` adresini açın. Yanıt anahtarları veya kişisel verileri içermez. Boş deponun erişim türü bu salt-okunur kontrolden anlaşılamaz; Vercel panelinden doğrulayın.
6. Panelden formu kaydedin, deneme başvurusu gönderin, panelde görünmesini ve CSV indirmeyi kontrol edin; deneme başvurusunu silin.

Depo çalışmıyorsa form gönderimi kapatılır; eski davranıştaki gibi yalnızca e-postaya güvenilip “kaydedildi” denmez.

## Eski public depodan veri taşıma

**Token değiştirmek eski public dosyaları gizlemez.** Public depo erişim türünü kodda `private` yazarak dönüştüremezsiniz. Yeni Private depo oluşturun.

1. Taşıma boyunca eski sitede başvuru alımını durdurun. Eski depoyu silmeyin.
2. Yerelde, Git'e eklenmeyen `.env.local` dosyasına eski depo token'ını `ESKI_BLOB_READ_WRITE_TOKEN`, yeni Private depo token'ını `BLOB_READ_WRITE_TOKEN` olarak ekleyin.
3. Node.js 22.3+ ile `npm run blob:migrate` çalıştırın. Varsayılan **dry-run** sadece dosya sayısını gösterir.
4. `npm run blob:migrate -- --copy` ile kopyalayın. Araç kaynak dosyaları silmez, hedefte farklı içerik varsa üzerine yazmaz.
5. Vercel bağlantısını yeni depoya yönlendirin. Açıkça tanımlanan token SDK'da OIDC'den önceliklidir; eski token'ı bırakmayın. Redeploy yapın ve form/yanıt sayısını doğrulayın.
6. Yedek ve doğrulama sonrası **eski public kopyaların erişimini ayrıca kaldırın**. CDN önbelleklerinin de temizlenmesini bekleyin. Bu araç kaynak verileri otomatik silmez.

## Spam koruması ve oturumlar

- İsteğe bağlı Cloudflare Turnstile için `TURNSTILE_SITE_KEY` ve `TURNSTILE_SECRET_KEY` birlikte tanımlanır. Site anahtarını ilgili alan adına izin verecek şekilde oluşturun. Anahtarlar yoksa CAPTCHA devreye girmez; honeypot tek başına güçlü bot koruması değildir.
- Vercel Firewall'da `/api/yanitlar` ve `/api/giris` POST isteklerine uygun rate-limit kuralı ekleyin. Bellek içi sayaçlar serverless ortamda güvenilir olmadığından uygulamaya böyle bir sayaç eklenmemiştir.
- Güncellemeden sonra yöneticiler yeniden giriş yapmalıdır. `YONETICI_EPOSTALAR` listesinden çıkarma + Redeploy mevcut oturum erişimini keser. Firebase'de hesabı kapatmak tek başına mevcut uygulama çerezini anında iptal etmez; acil durumda `OTURUM_SIRRI` değiştirip Redeploy ile tüm oturumları kapatın.
- Başvuru saklama süresini, erişecek yöneticileri ve yedek/silme politikasını belirleyin. Blob geçmişi otomatik yedekleme/geri yükleme hizmeti değildir.

## Kontroller

- `npm test`: dış servislere bağlanmadan doğrulama, sürüm çakışması, tekrar gönderim, oturum ve okuma hatası testleri (Node.js 22.3+).
- `npm run build`: üretim derlemesi.
- `/api/depo-durum`: giriş yapmış yönetici için Blob okuma ve GitHub bağlantı kontrolü; yazma yetkisi veya kota garantisi vermez.

E-postaların geleceği adres: https://dashboard.emailjs.com → **Email Templates** → `template_ky163wl` → **To Email**. Ücretsiz plan ayda yaklaşık 200 e-posta gönderir; kota dolarsa e-postalar durur ama kayıtlar sunucuya yazılmaya devam eder.
