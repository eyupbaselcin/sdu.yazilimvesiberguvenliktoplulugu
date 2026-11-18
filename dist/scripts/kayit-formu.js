(() => {
    const form = document.getElementById('kayitFormu');
    if (!form) {
        return;
    }

    // İletişim sayfasındaki (src/ContactPage.jsx) EmailJS hesabının aynısı: her kayıt ayrıca e-posta ile bildirilir.
    const EMAILJS_ANAHTAR = 'ptx5Peli60gOu-CBT';
    const EMAILJS_SERVIS = 'service_ew05ydl';
    const EMAILJS_SABLON = 'template_ky163wl';

    if (window.emailjs) {
        window.emailjs.init({ publicKey: EMAILJS_ANAHTAR });
    }

    const sorularKutusu = document.getElementById('kayitSorular');
    const durum = document.getElementById('kayitDurum');
    const gonderButonu = document.getElementById('kayitGonder');
    const MADDE_IKONLARI = ['fa-code', 'fa-brain', 'fa-laptop-code', 'fa-lightbulb', 'fa-users', 'fa-calendar-check'];

    let tanim = null;
    const istekId = crypto.randomUUID().replaceAll('-', '');
    let captchaWidget;
    let captchaGerekli = false;

    const mesajYaz = (metin, tur) => {
        durum.textContent = metin;
        durum.className = `kayit-durum ${tur || ''}`;
    };

    const el = (etiket, ozellikler = {}, ...cocuklar) => {
        const e = document.createElement(etiket);
        Object.entries(ozellikler).forEach(([k, v]) => {
            if (v === undefined || v === null || v === false) return;
            if (k === 'className') e.className = v;
            else if (k === 'text') e.textContent = v;
            else e.setAttribute(k, v === true ? '' : v);
        });
        e.append(...cocuklar);
        return e;
    };

    // ---- Formu çiz ----
    function basligiCiz(f) {
        document.getElementById('formUstBaslik').textContent = f.ustBaslik || '';
        document.getElementById('kayit-baslik').textContent = f.baslik;
        document.title = `${f.baslik} | SDÜ Yazılım ve Siber Güvenlik Topluluğu`;

        const uyari = document.getElementById('formUyari');
        uyari.hidden = !f.uyari;
        document.getElementById('formUyariMetni').textContent = f.uyari || '';

        document.getElementById('formMaddeler').replaceChildren(...(f.maddeler || []).map((m, i) =>
            el('li', {}, el('i', { className: `fa-solid ${MADDE_IKONLARI[i % MADDE_IKONLARI.length]}`, 'aria-hidden': 'true' }), ` ${m}`)));
    }

    function zorunluIsareti(soru) {
        return soru.zorunlu ? [' ', el('span', { text: '*' })] : [];
    }

    function soruCiz(soru) {
        const alanId = `soru_${soru.id}`;
        const aciklama = soru.aciklama ? el('p', { className: 'kayit-soru-aciklama', text: soru.aciklama }) : '';

        if (soru.tur === 'secim' || soru.tur === 'coklu') {
            const tip = soru.tur === 'secim' ? 'radio' : 'checkbox';
            return el('fieldset', { className: 'kayit-soru', 'data-soru': soru.id },
                el('legend', {}, soru.baslik, ...zorunluIsareti(soru)),
                aciklama,
                el('div', { className: 'kayit-secenekler' }, ...soru.secenekler.map((secenek) =>
                    el('label', {}, el('input', { type: tip, name: soru.id, value: secenek }), ` ${secenek}`))));
        }

        const ortak = { id: alanId, name: soru.id, required: soru.zorunlu, placeholder: 'Yanıtınız' };
        let alan;
        if (soru.tur === 'uzun') {
            alan = el('textarea', { ...ortak, maxlength: '2000', rows: '4' });
        } else if (soru.tur === 'eposta') {
            alan = el('input', { ...ortak, type: 'email', maxlength: '150', autocomplete: 'email', placeholder: 'ornek@mail.com' });
        } else if (soru.tur === 'telefon') {
            alan = el('input', { ...ortak, type: 'tel', maxlength: '20', inputmode: 'tel', autocomplete: 'tel', placeholder: '05XX XXX XX XX' });
        } else {
            alan = el('input', { ...ortak, type: 'text', maxlength: '300' });
        }

        return el('div', { className: 'kayit-soru', 'data-soru': soru.id },
            el('label', { for: alanId }, soru.baslik, ...zorunluIsareti(soru)),
            aciklama,
            alan);
    }

    function formuCiz(f) {
        tanim = f;
        basligiCiz(f);
        sorularKutusu.removeAttribute('aria-busy');

        if (f.acik === false) {
            sorularKutusu.replaceChildren(el('p', { className: 'kayit-kapali', text: 'Bu form şu anda yanıt kabul etmiyor. Yeni kayıt dönemi için bizi takip edin.' }));
            form.querySelector('.kayit-alt').hidden = true;
            document.getElementById('formZorunluNotu').hidden = true;
            return;
        }

        sorularKutusu.replaceChildren(...f.sorular.map(soruCiz));
        document.getElementById('formZorunluNotu').hidden = !f.sorular.some((s) => s.zorunlu);
    }

    async function formuYukle() {
        try {
            const yanit = await fetch('/api/form');
            const veri = yanit.ok ? await yanit.json() : null;
            if (!veri || !veri.form || !Array.isArray(veri.form.sorular)) throw new Error('Form tanımı alınamadı');
            formuCiz(veri.form);
            if (veri.captchaSiteKey && veri.form.acik !== false) {
                captchaGerekli = true;
                gonderButonu.disabled = true;
                const kutu = document.createElement('div');
                sorularKutusu.append(kutu);
                const betik = document.createElement('script');
                betik.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                betik.onload = () => {
                    captchaWidget = window.turnstile.render(kutu, { sitekey: veri.captchaSiteKey });
                    gonderButonu.disabled = false;
                };
                betik.onerror = () => mesajYaz('Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyin.', 'hata');
                document.head.append(betik);
            }
        } catch (hata) {
            console.error('Form sunucudan alınamadı.', hata);
            sorularKutusu.removeAttribute('aria-busy');
            gonderButonu.disabled = true;
            mesajYaz('Kayıt sistemi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.', 'hata');
        }
    }

    // ---- Cevapları topla ve doğrula ----
    function cevaplariTopla() {
        const cevaplar = {};
        let ilkHatali = null;

        form.querySelectorAll('.kayit-soru').forEach((kutu) => kutu.classList.remove('hatali'));

        tanim.sorular.forEach((soru) => {
            const kutu = sorularKutusu.querySelector(`[data-soru="${CSS.escape(soru.id)}"]`);
            let deger;
            let gecerli = true;

            if (soru.tur === 'secim') {
                deger = (kutu.querySelector('input:checked') || {}).value || '';
            } else if (soru.tur === 'coklu') {
                deger = [...kutu.querySelectorAll('input:checked')].map((i) => i.value);
            } else {
                const alan = kutu.querySelector('input, textarea');
                alan.value = alan.value.trim();
                deger = alan.value;
                if (deger && soru.tur === 'eposta') gecerli = alan.checkValidity() && /\.[^.@\s]{2,}$/.test(deger);
                if (deger && soru.tur === 'telefon') {
                    const rakam = deger.replace(/\D/g, '').length;
                    gecerli = /^[0-9+()\s-]+$/.test(deger) && rakam >= 10 && rakam <= 13;
                }
            }

            const bos = Array.isArray(deger) ? !deger.length : !deger;
            if ((soru.zorunlu && bos) || !gecerli) {
                kutu.classList.add('hatali');
                ilkHatali = ilkHatali || kutu.querySelector('input, textarea');
            }
            cevaplar[soru.id] = deger;
        });

        if (ilkHatali) {
            ilkHatali.focus();
            mesajYaz('Lütfen kırmızı ile işaretlenen alanları doğru şekilde doldurun.', 'hata');
            return null;
        }
        return cevaplar;
    }

    function epostaMetni(cevaplar, tarih) {
        return [
            `${tanim.baslik.toLocaleUpperCase('tr')} – YENİ KAYIT`,
            '',
            ...tanim.sorular.map((s) => {
                const c = cevaplar[s.id];
                return `${s.baslik}: ${Array.isArray(c) ? c.join(', ') : c || '-'}`;
            }),
            `Tarih: ${tarih}`,
        ].join('\n');
    }

    // İlk metin / e-posta sorusunu e-postanın gönderen adı ve adresi olarak kullan.
    const ilkCevap = (cevaplar, turler) => {
        const soru = tanim.sorular.find((s) => turler.includes(s.tur) && cevaplar[s.id]);
        return soru ? cevaplar[soru.id] : '';
    };

    // ---- Gönder ----
    form.addEventListener('input', (olay) => {
        const kutu = olay.target.closest('.kayit-soru');
        if (kutu) kutu.classList.remove('hatali');
    });

    form.addEventListener('reset', () => {
        form.querySelectorAll('.kayit-soru').forEach((kutu) => kutu.classList.remove('hatali'));
        mesajYaz('', '');
    });

    form.addEventListener('submit', async (olay) => {
        olay.preventDefault();
        if (!tanim || tanim.acik === false) return;

        const cevaplar = cevaplariTopla();
        if (!cevaplar) return;
        const captcha = captchaGerekli ? window.turnstile?.getResponse(captchaWidget) : undefined;
        if (captchaGerekli && !captcha) {
            mesajYaz('Lütfen güvenlik doğrulamasını tamamlayın.', 'hata');
            return;
        }

        gonderButonu.disabled = true;
        gonderButonu.textContent = 'Gönderiliyor…';
        mesajYaz('', '');

        try {
            const tuzak = form.elements.web_sitesi.value;
            const tarih = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

            // Başarı yalnızca sunucunun kalıcı kaydı onaylamasından sonra gösterilir.
            const yanit = await fetch('/api/yanitlar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cevaplar, web_sitesi: tuzak, surum: tanim.surum, istekId, captcha }),
                });
            const sonuc = await yanit.json().catch(() => ({}));
            if (!yanit.ok || sonuc.basarili !== true) {
                throw new Error(sonuc.mesaj || `Sunucu kaydı alamadı (${yanit.status}).`);
            }

            if (window.emailjs && !tuzak) {
                Promise.resolve().then(() => window.emailjs.send(EMAILJS_SERVIS, EMAILJS_SABLON, {
                    from_name: ilkCevap(cevaplar, ['kisa']) || 'Eğitim kaydı',
                    from_email: ilkCevap(cevaplar, ['eposta']),
                    message: epostaMetni(cevaplar, tarih),
                })).catch((hata) => console.warn('Kayıt saklandı, e-posta bildirimi gönderilemedi.', hata));
            }

            const tesekkur = el('div', { className: 'kayit-tesekkur', role: 'status' },
                el('i', { className: 'fa-solid fa-circle-check', 'aria-hidden': 'true' }),
                el('h3', { className: 'text-xl font-bold mt-3', text: 'Yanıtınız kaydedildi' }),
                el('p', { className: 'mt-2', text: 'Kaydınız alındı. Eğitimde görüşmek üzere!' }));
            form.replaceWith(tesekkur);
        } catch (hata) {
            if (captchaGerekli && captchaWidget !== undefined) window.turnstile.reset(captchaWidget);
            mesajYaz(hata instanceof Error ? hata.message : 'Form gönderilemedi. Lütfen biraz sonra tekrar deneyin.', 'hata');
            gonderButonu.disabled = false;
            gonderButonu.textContent = 'Gönder';
        }
    });

    formuYukle();
})();
