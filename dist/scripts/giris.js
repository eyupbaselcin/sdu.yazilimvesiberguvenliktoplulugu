const errorMessage = document.getElementById('passwordError');
const query = new URLSearchParams(window.location.search);

if (query.has('error')) {
    errorMessage.textContent = 'Şifre doğrulanamadı. Lütfen tekrar deneyin.';
}
