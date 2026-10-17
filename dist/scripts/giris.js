// SDÜ Yazılım ve Siber Güvenlik Topluluğu Giriş Doğrulama Scripti
const errorMessage = document.getElementById('passwordError');
const query = new URLSearchParams(window.location.search);

if (query.has('error') && errorMessage) {
    errorMessage.textContent = 'Şifre doğrulanamadı. Lütfen tekrar deneyin.';
}
