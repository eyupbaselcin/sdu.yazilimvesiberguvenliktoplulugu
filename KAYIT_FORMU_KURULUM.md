# Eğitim kayıt formu

"Eğitim Kaydı" sayfası (`pages/egitim-kayit.html`) Google Forms gibi çalışır: başlığı, açıklamaları ve soruları yöneticiler panelden değiştirir, yanıtlar panelde görülür ve Excel'e indirilir.

## Yönetim paneli

Giriş sayfasından yönetici olarak girin. Panelde üç sekme var:

- **Etkinlikler**: etkinlik ekleme/düzenleme/silme.
- **Kayıt formu**: üst başlık, form başlığı, uyarı kutusu, açıklama maddeleri ve sorular.
  - Soru türleri: Kısa yanıt, Paragraf, E-posta, Telefon, Çoktan seçmeli (tek), Onay kutuları (çoklu).
  - Her soru zorunlu yapılabilir, yukarı/aşağı taşınabilir, kopyalanabilir, silinebilir.
  - **Yanıt kabul ediliyor** işareti kaldırılırsa form kapanır; sayfada "yanıt kabul etmiyor" yazar.
  - Değişiklikler **Formu kaydet** ile yayına girer. Her kayıtta formun önceki hali saklanır (son 10 sürüm).
- **Yanıtlar**: tüm kayıtlar tablo halinde, en yeni üstte. Arama, tek tek silme ve **Excel (CSV) indir**.

Soruları değiştirmek eski yanıtları bozmaz: her yanıt, gönderildiği andaki soru metinleriyle saklanır. Silinen bir sorunun eski cevapları da tabloda ve Excel dosyasında görünmeye devam eder.

## Kayıtlar nerede saklanır

Her kayıt **iki yere birden** gider; biri çalışmazsa diğeri kaydı tutar:

1. **Sunucu (Vercel Blob)**: `api/yanitlar.js`. Her yanıt ayrı, tahmin edilemez adlı bir dosyadır (aynı anda gelen kayıtlar birbirini ezmez). Yanıtların listesine yalnızca giriş yapmış yönetici ulaşabilir.
2. **E-posta (EmailJS)**: iletişim formuyla aynı hesap ve şablon (`service_ew05ydl`, `template_ky163wl`). E-postada tüm soru ve cevaplar yazar.

Sunucu her cevabı formdaki sorulara göre yeniden kontrol eder (zorunlu alanlar, seçenek listesi, e-posta ve telefon biçimi). Listede olmayan alanlar kaydedilmez.

## Kurulum

Vercel Blob deposunun kurulu olması yeterli (etkinliklerle aynı depo). Adımlar `GALERI_KURULUM.md` dosyasında. Depo kurulana kadar:

- Form sayfası varsayılan soruları gösterir.
- Kayıtlar yalnızca e-posta ile gelir.
- Panelde formu kaydetmek ve yanıtları görmek "Depo kurulmamış" uyarısı verir.

E-postaların geleceği adres: https://dashboard.emailjs.com → **Email Templates** → `template_ky163wl` → **To Email**. Ücretsiz plan ayda yaklaşık 200 e-posta gönderir; kota dolarsa e-postalar durur ama kayıtlar sunucuya yazılmaya devam eder.
