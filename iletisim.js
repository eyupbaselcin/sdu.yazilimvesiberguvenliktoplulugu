const form = document.querySelector("#form");

// EmailJS Başlatma
emailjs.init("ptx5Peli60gOu-CBT");

function validateName(isim) {
    if (isim.length < 3) {
        return "İsim en az 3 karakter olmalı.";
    }
    return "";
}

function validateEmail(mail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(mail)) {
        return "Geçerli bir e-posta adresi giriniz.";
    }
    return "";
}

function validateText(text) {
    if (text.length < 10) {
        return "Mesaj en az 10 karakter olmalı.";
    }
    return "";
}

form.addEventListener("submit", function (kayit) {
    kayit.preventDefault();

    const isim = document.getElementById("isim").value.trim();
    const eposta = document.getElementById("eposta").value.trim();
    const oneri = document.getElementById("oneri").value.trim();

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const textError = document.getElementById("textError");

    const nameValidation = validateName(isim);
    const emailValidation = validateEmail(eposta);
    const textValidation = validateText(oneri);

    nameError.textContent = nameValidation;
    emailError.textContent = emailValidation;
    textError.textContent = textValidation;

    if (nameValidation || emailValidation || textValidation) {
        return;
    }

    const templateParams = {
        from_name: isim,
        from_email: eposta,
        message: oneri
    };

    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) submitBtn.disabled = true;

    // Service ID: service_ew05ydl | Template ID: template_ky163wl
    emailjs.send("service_ew05ydl", "template_ky163wl", templateParams)
        .then(function (response) {
            console.log("İletişim Başarılı!", response.status, response.text);
            alert(`Mesajınız alındı, ${isim}! Şikayet/öneriniz iletildi.`);
            form.reset();
            nameError.textContent = "";
            emailError.textContent = "";
            textError.textContent = "";
        })
        .catch(function (error) {
            console.error("Hata:", error);
            alert("Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.");
        })
        .finally(function () {
            if (submitBtn) submitBtn.disabled = false;
        });
});