
const form = document.querySelector("form")

// Validation fonksiyonları
function validateName(name) {
    if (name.length < 3) {
        return "İsim en az 3 karakter olmalı";
    }
    return "";
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return "Geçerli bir email adresi giriniz";
    }
    return "";
}

function validatePhone(phone) {
    const phoneRegex = /^5\d{9}$/;
    if (!phoneRegex.test(phone)) {
        return "Telefon numarası 5 ile başlamalı ve 10 haneli olmalı";
    }
    return "";
}

function validatePassword(password) {
    if (password.length < 6) {
        return "Şifre en az 6 karakter olmalı";
    }
    return "";
}

form.addEventListener('submit', function(kayit) {
    kayit.preventDefault();
    const kullaniciAdi = document.getElementById('kullaniciAdi').value.trim();
    const eposta = document.getElementById('eposta').value.trim();
    const numara = document.getElementById('numara').value.trim();
    const sifre = document.getElementById('sifre').value;

    // Error elements
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const phoneError = document.getElementById('phoneError');
    const passwordError = document.getElementById('passwordError');

    // Validations
    let isValid = true;
    
    nameError.textContent = validateName(kullaniciAdi);
    if (nameError.textContent) isValid = false;
    
    emailError.textContent = validateEmail(eposta);
    if (emailError.textContent) isValid = false;
    
    phoneError.textContent = validatePhone(numara);
    if (phoneError.textContent) isValid = false;
    
    passwordError.textContent = validatePassword(sifre);
    if (passwordError.textContent) isValid = false;

    if (isValid) {
        const kullaniciVerisi = {
            isim: kullaniciAdi,
            email: eposta,
            numara: numara,
            sifre: sifre
        };

        console.log("Giriş Başarılı!", kullaniciVerisi);
        alert(`Hoş geldin, ${kullaniciVerisi.isim}! Giriş Başarılı.`);
        form.reset();
    }
});
