(() => {
    const form = document.getElementById('kayitFormu');
    if (!form) {
        return;
    }

    // İletişim sayfasındaki (src/ContactPage.jsx) EmailJS hesabının aynısı: her kayıt ayrıca e-posta ile bildirilir.
    const EMAILJS_ANAHTAR = 'ptx5Peli60gOu-CBT';
    const EMAILJS_SERVIS = 'service_ew05ydl';
    const EMAILJS_SABLON = 'template_ky163wl';

    // Sunucuya ulaşılamazsa (ör. bağlantı sorunu) gösterilecek form. Asıl form yönetim panelinden düzenlenir.
    const YEDEK_FORM = {
        ustBaslik: 'Süleyman Demirel Üniversitesi Yazılım ve Siber Güvenlik Topluluğu',
        baslik: 'Algoritma ve Programlama Eğitimleri',
        uyari: 'LÜTFEN VS CODE VE ANTIGRAVITY KURULUMUNU YAPARAK GELİNİZ',
        maddeler: ['Temel seviyede C dili eğitimi', 'Yapay Zeka Destekli / Ezbersel değil mantıksal'],
        acik: true,
        sorular: [
            { id: 'ad_soyad', baslik: 'Ad Soyad', tur: 'kisa', zorunlu: true },
            { id: 'sinif', baslik: 'Kaçıncı sınıfsınız?', tur: 'secim', zorunlu: true, secenekler: ['Hazırlık', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Yüksek Lisans / Diğer'] },
            { id: 'telefon', baslik: 'İletişim numarası', tur: 'telefon', zorunlu: true },
            { id: 'eposta', baslik: 'E-posta adresi', tur: 'eposta', zorunlu: true },
        ],
    };

    if (window.emailjs) {
        window.emailjs.init({ publicKey: EMAILJS_ANAHTAR });
    }

    const sorularKutusu = document.getElementById('kayitSorular');
    const durum = document.getElementById('kayitDurum');
    const gonderButonu = document.getElementById('kayitGonder');
    const MADDE_IKONLARI = ['fa-code', 'fa-brain', 'fa-laptop-code', 'fa-lightbulb', 'fa-users', 'fa-calendar-check'];

    let tanim = null;

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
        } catch (hata) {
            console.warn('Form sunucudan alınamadı, yedek form gösteriliyor.', hata);
            formuCiz(YEDEK_FORM);
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

        gonderButonu.disabled = true;
        gonderButonu.textContent = 'Gönderiliyor…';
        mesajYaz('', '');

        try {
            const tuzak = form.elements.web_sitesi.value;
            const tarih = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

            // Kayıt iki yere birden gider; biri başarısız olsa bile diğeri kaydı tutar.
            const gonderimler = [
                fetch('/api/yanitlar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cevaplar, web_sitesi: tuzak }),
                }).then(async (yanit) => {
                    const sonuc = await yanit.json().catch(() => ({}));
                    if (!yanit.ok) {
                        const hata = new Error(sonuc.mesaj || `Sunucu kaydı alamadı (${yanit.status}).`);
                        hata.dogrulama = yanit.status === 422 || yanit.status === 403;
                        throw hata;
                    }
                }),
            ];

            if (window.emailjs && !tuzak) {
                gonderimler.push(window.emailjs.send(EMAILJS_SERVIS, EMAILJS_SABLON, {
                    from_name: ilkCevap(cevaplar, ['kisa']) || 'Eğitim kaydı',
                    from_email: ilkCevap(cevaplar, ['eposta']),
                    message: epostaMetni(cevaplar, tarih),
                }));
            }

            const sonuclar = await Promise.allSettled(gonderimler);
            sonuclar
                .filter((s) => s.status === 'rejected')
                .forEach((s) => console.error('Kayıt kanallarından biri başarısız:', s.reason));

            const sunucu = sonuclar[0];
            // Sunucu cevabı reddettiyse (eksik/yanlış bilgi, form kapalı) kişiye bunu göster.
            if (sunucu.status === 'rejected' && sunucu.reason.dogrulama) {
                throw sunucu.reason;
            }
            if (!sonuclar.some((s) => s.status === 'fulfilled')) {
                throw new Error('Form gönderilemedi. Lütfen biraz sonra tekrar deneyin.');
            }

            const tesekkur = el('div', { className: 'kayit-tesekkur', role: 'status' },
                el('i', { className: 'fa-solid fa-circle-check', 'aria-hidden': 'true' }),
                el('h3', { className: 'text-xl font-bold mt-3', text: 'Yanıtınız kaydedildi' }),
                el('p', { className: 'mt-2', text: 'Kaydınız alındı. Eğitimde görüşmek üzere!' }));
            form.replaceWith(tesekkur);
        } catch (hata) {
            mesajYaz(hata instanceof Error ? hata.message : 'Form gönderilemedi. Lütfen biraz sonra tekrar deneyin.', 'hata');
            gonderButonu.disabled = false;
            gonderButonu.textContent = 'Gönder';
        }
    });

    formuYukle();
})();
