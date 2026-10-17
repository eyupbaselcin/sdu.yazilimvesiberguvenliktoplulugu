import { useState } from "react";
import emailjs from "@emailjs/browser";
import "../styles/iletisim.css";
import "../styles/community.css";

emailjs.init({ publicKey: "ptx5Peli60gOu-CBT" });

const initialValues = {
  name: "",
  email: "",
  message: "",
};

function validate(values) {
  const errors = {};

  if (values.name.length < 3) {
    errors.name = "İsim en az 3 karakter olmalı.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Geçerli bir e-posta adresi giriniz.";
  }

  if (values.message.length < 10) {
    errors.message = "Mesaj en az 10 karakter olmalı.";
  }

  return errors;
}

export default function ContactPage() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState(null);
  const [isSending, setIsSending] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((currentValues) => ({ ...currentValues, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedValues = {
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
    };
    const validationErrors = validate(trimmedValues);
    setErrors(validationErrors);
    setStatus(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSending(true);

    try {
      await emailjs.send("service_ew05ydl", "template_ky163wl", {
        from_name: trimmedValues.name,
        from_email: trimmedValues.email,
        message: trimmedValues.message,
      });
      setStatus({
        type: "success",
        text: `Mesajınız alındı, ${trimmedValues.name}! Şikayet/öneriniz iletildi.`,
      });
      setValues(initialValues);
      setErrors({});
    } catch (error) {
      console.error("Mesaj gönderilemedi:", error);
      setStatus({
        type: "error",
        text: "Mesaj gönderilirken bir hata oluştu. Lütfen tekrar deneyiniz.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="site-page">
      <header className="site-header" aria-label="Üst bilgi">
        <a className="site-brand" href="index.html" aria-label="Topluluk ana sayfası">
          <span className="site-brand__logo">
            <img src="../assets/images/yazılım_siber_logo.png" alt="" />
          </span>
          <span className="site-brand__title">
            <span>Topluluk Hub</span>
            <span>Yazılım ve Siber Güvenlik</span>
          </span>
        </a>
        <nav className="site-nav" aria-label="Ana navigasyon">
          <a className="site-nav__link" href="etkinlik.html">Etkinlikler</a>
          <a className="site-nav__link" href="ToplulukHakkinda.html">Yönetim Ekibimiz</a>
          <a className="site-nav__link active" href="iletisim.html" aria-current="page">İletişim</a>
          <a className="site-nav__link" href="giris.html">Giriş</a>
          <a className="site-nav__link" href="syber.html">Siber Güvenlik</a>
        </nav>
        <div className="site-header-actions">
          <button
            id="themeToggle"
            type="button"
            aria-label="Temayı Değiştir"
            className="theme-toggle-btn"
            onClick={() => {
              const isDark = document.documentElement.classList.toggle('dark');
              document.body?.classList.toggle('dark', isDark);
              localStorage.setItem('theme', isDark ? 'dark' : 'light');
            }}
          >
            <i className="fa-solid fa-moon dark-icon" />
            <i className="fa-solid fa-sun light-icon" />
          </button>
        </div>
      </header>
      <main className="contact-page">
        <section className="contact-card" aria-labelledby="contact-title">
        <div className="contact-info">
          <span className="eyebrow">SDÜ Yazılım ve Siber Güvenlik Topluluğu</span>
          <h1 id="contact-title">Bize Ulaşın</h1>
          <p className="contact-description">
            Öneri, şikayet veya sorularınızı bizimle paylaşın. Görüşleriniz
            topluluğumuzu geliştirmemize yardımcı olur.
          </p>

          <div className="social-links" aria-label="Sosyal medya hesaplarımız">
            <a
              href="https://www.instagram.com/sduyzlm"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram hesabı: sduyzlm"
            >
              <span className="social-links__label">sduyzlm</span>
              <span className="social-links__icon">
                <i className="fa-brands fa-instagram" aria-hidden="true" />
              </span>
            </a>
            <a
              href="https://www.linkedin.com/company/sduyaz%C4%B1l%C4%B1m/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn: Yazılım ve Siber Güvenlik Topluluğu"
            >
              <span className="social-links__label">YSGT</span>
              <span className="social-links__icon">
                <i className="fa-brands fa-linkedin-in" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>

        <div className="contact-form-area">
          <p className="form-intro">
            Harika işler, birlikte çalışan harika insanlarla mümkün. Mesajınızı
            bekliyoruz.
          </p>

          <form id="form" onSubmit={handleSubmit} noValidate>
            <div className="satir">
              <label htmlFor="isim">İsim Soyisim</label>
              <input
                type="text"
                id="isim"
                name="name"
                autoComplete="name"
                placeholder="Adınızı ve soyadınızı girin"
                value={values.name}
                onChange={handleChange}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? "nameError" : undefined}
                required
              />
              <p id="nameError" className="error" aria-live="polite">
                {errors.name}
              </p>
            </div>

            <div className="satir">
              <label htmlFor="eposta">E-posta Adresi</label>
              <input
                type="email"
                id="eposta"
                name="email"
                autoComplete="email"
                placeholder="ornek@eposta.com"
                value={values.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "emailError" : undefined}
                required
              />
              <p id="emailError" className="error" aria-live="polite">
                {errors.email}
              </p>
            </div>

            <div className="satir">
              <label htmlFor="oneri">Öneri veya Şikayet</label>
              <textarea
                id="oneri"
                name="message"
                rows="5"
                placeholder="Mesajınızı buraya yazın"
                value={values.message}
                onChange={handleChange}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? "textError" : undefined}
                required
              />
              <p id="textError" className="error" aria-live="polite">
                {errors.message}
              </p>
            </div>

            <button type="submit" disabled={isSending}>
              {isSending ? "Gönderiliyor..." : "Mesajı Gönder"}
            </button>
            {status && (
              <p
                className={`form-status form-status--${status.type}`}
                role={status.type === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {status.text}
              </p>
            )}
          </form>
        </div>
        </section>
      </main>
    </div>
  );
}
