# Özel fotoğraf galerisi kurulumu

Bu galeri PHP oturumları ve Apache `.htaccess` kuralları kullanır; cPanel/Plesk üzerindeki PHP destekli HTTPS alan adında çalıştırılmalıdır. HTML dosyasını doğrudan bilgisayarda açmakla giriş koruması çalışmaz.

## Yayına alma

1. Proje dosyalarını `sduyzlm.com` alan adının web köküne yükleyin. `galeri-private` içindeki `.htaccess` dosyalarının da yüklendiğini kontrol edin.
2. cPanel Dosya Yöneticisi'nde `galeri-private/config.example.php` dosyasını kopyalayıp kopyaya `config.php` adını verin.
3. cPanel Terminal'de aşağıdaki komutu çalıştırın. İstendiğinde ortak galeri şifresini girin. Komut salt ve hash üretir; ekranda görünen bu iki değeri yapılandırmaya koyun:

   ```sh
   php -r '$password = rtrim(fgets(STDIN), "\r\n"); $salt = random_bytes(16); echo bin2hex($salt), PHP_EOL, hash_pbkdf2("sha256", $password, $salt, 600000, 32), PHP_EOL;'
   ```

4. `galeri-private/config.php` içindeki `TUZ_DEGERINI_BURAYA_YAPISTIRIN` ve `HASH_DEGERINI_BURAYA_YAPISTIRIN` değerlerini sırasıyla üretilen salt ve hash ile değiştirin. İterasyon sayısını `600000` olarak bırakın. `config.php` dosyasını herkese açık bir depoya göndermeyin; `.gitignore` bu dosyayı hariç tutar.
5. Fotoğrafları `galeri-private/images/` klasörüne yükleyin. Desteklenen biçimler JPG, JPEG, PNG, GIF ve WEBP'dir. Klasörün `.htaccess` dosyasını silmeyin.
6. `https://sduyzlm.com/giris.html` adresinden giriş yapın. Galeriden çıkış bağlantısını kullanarak oturumu kapatın.

Görseller, oturum doğrulaması yapan PHP uç noktası üzerinden verilir; `galeri-private` klasörüne doğrudan HTTP erişimi engellenir. Ortak parola tüm kullanıcılarca paylaşıldığından hesap bazlı izleme veya kullanıcıya özel yetki sağlamaz.

Tarayıcılar ekran görüntüsü alınmasını kesin olarak engelleyemez. Bu kurulum doğrudan görsel URL'lerini ve oturum açmadan erişimi korur; yetkili bir kullanıcı ekran görüntüsü alabilir veya görüntüyü kaydedebilir.
