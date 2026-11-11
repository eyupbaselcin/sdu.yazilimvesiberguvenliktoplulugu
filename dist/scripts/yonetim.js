// Yönetim paneli (Kontrol masası): etkinlik listesi, ekleme, düzenleme, silme.
// Veriler /api/etkinlikler üzerinden sunucuda (Vercel Blob) saklanır; siteye giren herkes görür.
(() => {
    const API = '/api/etkinlikler';
    const AFIS_EN_GENIS = 1600; // px – afiş yüklenmeden önce bu boyuta küçültülür
    const AFIS_EN_FAZLA_BAYT = 3.2 * 1024 * 1024;

    const tablo = document.getElementById('etkinlikTablosu');
    const durum = document.getElementById('yonetimDurum');
    const dialog = document.getElementById('etkinlikDialog');
    const form = document.getElementById('etkinlikFormu');
    const dialogBaslik = document.getElementById('dialogBaslik');
    const dialogDurum = document.getElementById('dialogDurum');
    const kaydetBtn = document.getElementById('kaydetBtn');
    const afisDosyasi = document.getElementById('afisDosyasi');
    const afisOnizleme = document.getElementById('afisOnizleme');
    const afisMetni = document.getElementById('afisMetni');

    let etkinlikler = [];
    let duzenlenenId = null;
    let afisVeri = null; // yeni seçilen afiş (data URL)

    const iki = (n) => String(n).padStart(2, '0');
    const bugunMetni = () => {
        const b = new Date();
        return `${b.getFullYear()}-${iki(b.getMonth() + 1)}-${iki(b.getDate())}`;
    };
    const tarihGoster = (tarih) => new Date(`${tarih}T12:00:00`)
        .toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });

    function mesaj(el, metin, tur) {
        el.textContent = metin || '';
        el.className = `yonetim-durum ${tur || ''}`;
    }

    async function istek(yontem, govde, id) {
        const url = id ? `${API}?id=${encodeURIComponent(id)}` : `${API}?taze=${Date.now()}`;
        const yanit = await fetch(url, {
            method: yontem,
            credentials: 'same-origin',
            headers: govde ? { 'Content-Type': 'application/json' } : {},
            body: govde ? JSON.stringify(govde) : undefined,
        });
        const veri = await yanit.json().catch(() => ({}));
        if (yanit.status === 401) {
            // Oturum süresi dolduysa giriş ekranına dön.
            window.showSection?.(false);
        }
        if (!yanit.ok) {
            throw new Error(veri.mesaj || `İşlem başarısız (${yanit.status}).`);
        }
        return veri;
    }

    // ---- Liste ----
    async function listeyiYukle() {
        try {
            const veri = await istek('GET');
            etkinlikler = veri.etkinlikler || [];
            ciz();
        } catch (hata) {
            tablo.replaceChildren(bosSatir('Etkinlikler yüklenemedi.'));
            mesaj(durum, hata.message, 'hata');
        }
    }

    function bosSatir(metin) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'yonetim-bos';
        td.textContent = metin;
        tr.appendChild(td);
        return tr;
    }

    function ciz() {
        const bugun = bugunMetni();
        const kategoriler = new Set(etkinlikler.map((e) => e.kategori.toLocaleLowerCase('tr')));

        document.getElementById('ozetToplam').textContent = iki(etkinlikler.length);
        document.getElementById('ozetKategori').textContent = iki(kategoriler.size);
        document.getElementById('ozetYaklasan').textContent = iki(etkinlikler.filter((e) => e.tarih >= bugun).length);

        // Kategori önerileri (form)
        const liste = document.getElementById('kategoriListesi');
        liste.replaceChildren(...[...new Set(etkinlikler.map((e) => e.kategori))].sort((a, b) => a.localeCompare(b, 'tr'))
            .map((k) => Object.assign(document.createElement('option'), { value: k })));

        if (!etkinlikler.length) {
            tablo.replaceChildren(bosSatir('Henüz etkinlik yok. "Etkinlik ekle" ile ilk etkinliği oluşturun.'));
            return;
        }

        tablo.replaceChildren(...etkinlikler.map((e) => {
            const tr = document.createElement('tr');
            if (e.tarih < bugun) tr.className = 'yonetim-gecmis';

            const tdAd = document.createElement('td');
            const kutu = document.createElement('div');
            kutu.className = 'y-etkinlik';
            const img = document.createElement('img');
            img.src = e.afis;
            img.alt = '';
            img.loading = 'lazy';
            const yazi = document.createElement('div');
            const ad = document.createElement('strong');
            ad.textContent = e.ad;
            const saat = document.createElement('small');
            saat.textContent = e.saat || 'Saat belirtilmedi';
            yazi.append(ad, saat);
            kutu.append(img, yazi);
            tdAd.appendChild(kutu);

            const tdKategori = document.createElement('td');
            const etiket = document.createElement('span');
            etiket.className = 'y-etiket';
            etiket.textContent = e.kategori;
            tdKategori.appendChild(etiket);

            const tdTarih = document.createElement('td');
            tdTarih.textContent = tarihGoster(e.tarih);

            const tdYer = document.createElement('td');
            tdYer.textContent = e.yer || '—';

            const tdIslem = document.createElement('td');
            const islem = document.createElement('div');
            islem.className = 'y-islem';
            const duzenle = document.createElement('button');
            duzenle.type = 'button';
            duzenle.className = 'y-duzenle';
            duzenle.textContent = 'Düzenle';
            duzenle.addEventListener('click', () => dialogAc(e));
            const sil = document.createElement('button');
            sil.type = 'button';
            sil.className = 'y-sil';
            sil.textContent = 'Sil';
            sil.addEventListener('click', () => etkinlikSil(e, sil));
            islem.append(duzenle, sil);
            tdIslem.appendChild(islem);

            tr.append(tdAd, tdKategori, tdTarih, tdYer, tdIslem);
            return tr;
        }));
    }

    // ---- Ekle / Düzenle ----
    function afisGoster(src) {
        afisOnizleme.hidden = !src;
        afisOnizleme.src = src || '';
        afisMetni.innerHTML = src
            ? '<i class="fa-solid fa-arrows-rotate" aria-hidden="true"></i> Değiştirmek için tıklayın'
            : '<i class="fa-solid fa-cloud-arrow-up" aria-hidden="true"></i> Afiş seçmek için tıklayın (JPG, PNG, WEBP)';
    }

    function dialogAc(etkinlik) {
        form.reset();
        duzenlenenId = etkinlik ? etkinlik.id : null;
        afisVeri = null;
        mesaj(dialogDurum, '');
        dialogBaslik.textContent = etkinlik ? 'Etkinliği düzenle' : 'Yeni etkinlik';
        kaydetBtn.textContent = etkinlik ? 'Değişiklikleri kaydet' : 'Etkinliği yayınla';

        if (etkinlik) {
            ['ad', 'kategori', 'yer', 'tarih', 'saat', 'aciklama'].forEach((alan) => {
                form.elements[alan].value = etkinlik[alan] || '';
            });
        }
        afisGoster(etkinlik ? etkinlik.afis : null);
        dialog.showModal();
        form.elements.ad.focus();
    }

    // Afişi tarayıcıda küçültüp JPEG'e çevirir (telefon fotoğrafları da sınırın altında kalır).
    function afisiHazirla(dosya) {
        return new Promise((coz, reddet) => {
            if (!/^image\/(jpeg|png|webp)$/.test(dosya.type)) {
                reddet(new Error('Afiş JPG, PNG veya WEBP olmalı.'));
                return;
            }
            const url = URL.createObjectURL(dosya);
            const resim = new Image();
            resim.onload = () => {
                const oran = Math.min(1, AFIS_EN_GENIS / Math.max(resim.naturalWidth, resim.naturalHeight));
                const tuval = document.createElement('canvas');
                tuval.width = Math.round(resim.naturalWidth * oran);
                tuval.height = Math.round(resim.naturalHeight * oran);
                const ctx = tuval.getContext('2d');
                ctx.fillStyle = '#ffffff'; // saydam PNG'lerde siyah zemin olmasın
                ctx.fillRect(0, 0, tuval.width, tuval.height);
                ctx.drawImage(resim, 0, 0, tuval.width, tuval.height);
                URL.revokeObjectURL(url);

                let kalite = 0.88;
                let veri = tuval.toDataURL('image/jpeg', kalite);
                while (veri.length * 0.75 > AFIS_EN_FAZLA_BAYT && kalite > 0.5) {
                    kalite -= 0.1;
                    veri = tuval.toDataURL('image/jpeg', kalite);
                }
                coz(veri);
            };
            resim.onerror = () => {
                URL.revokeObjectURL(url);
                reddet(new Error('Afiş okunamadı. Başka bir dosya deneyin.'));
            };
            resim.src = url;
        });
    }

    afisDosyasi.addEventListener('change', async () => {
        const dosya = afisDosyasi.files[0];
        if (!dosya) return;
        try {
            mesaj(dialogDurum, 'Afiş hazırlanıyor…');
            afisVeri = await afisiHazirla(dosya);
            afisGoster(afisVeri);
            mesaj(dialogDurum, '');
        } catch (hata) {
            afisVeri = null;
            afisDosyasi.value = '';
            mesaj(dialogDurum, hata.message, 'hata');
        }
    });

    form.addEventListener('submit', async (olay) => {
        olay.preventDefault();

        const bilgiler = {
            ad: form.elements.ad.value.trim(),
            kategori: form.elements.kategori.value.trim(),
            yer: form.elements.yer.value.trim(),
            tarih: form.elements.tarih.value,
            saat: form.elements.saat.value,
            aciklama: form.elements.aciklama.value.trim(),
        };

        if (bilgiler.ad.length < 3) return mesaj(dialogDurum, 'Etkinlik adı en az 3 karakter olmalı.', 'hata');
        if (bilgiler.kategori.length < 2) return mesaj(dialogDurum, 'Kategori girin (örn. Eğitim).', 'hata');
        if (!bilgiler.tarih) return mesaj(dialogDurum, 'Tarih seçin.', 'hata');
        if (!duzenlenenId && !afisVeri) return mesaj(dialogDurum, 'Lütfen bir afiş yükleyin.', 'hata');
        if (afisVeri) bilgiler.afisVeri = afisVeri;

        kaydetBtn.disabled = true;
        const eskiMetin = kaydetBtn.textContent;
        kaydetBtn.textContent = 'Kaydediliyor…';
        mesaj(dialogDurum, '');

        try {
            await istek(duzenlenenId ? 'PUT' : 'POST', bilgiler, duzenlenenId);
            dialog.close();
            mesaj(durum, duzenlenenId ? 'Etkinlik güncellendi.' : 'Etkinlik yayınlandı. Etkinlikler sayfasında görünüyor.', 'basarili');
            await listeyiYukle();
        } catch (hata) {
            mesaj(dialogDurum, hata.message, 'hata');
        } finally {
            kaydetBtn.disabled = false;
            kaydetBtn.textContent = eskiMetin;
        }
    });

    // ---- Sil ----
    async function etkinlikSil(etkinlik, dugme) {
        if (!confirm(`"${etkinlik.ad}" etkinliği silinsin mi? Etkinlikler sayfasından da kaldırılır.`)) return;
        dugme.disabled = true;
        try {
            await istek('DELETE', null, etkinlik.id);
            mesaj(durum, 'Etkinlik silindi.', 'basarili');
            await listeyiYukle();
        } catch (hata) {
            mesaj(durum, hata.message, 'hata');
            dugme.disabled = false;
        }
    }

    // ---- Bağlantılar ----
    document.getElementById('etkinlikEkleBtn').addEventListener('click', () => dialogAc(null));
    dialog.querySelectorAll('[data-kapat]').forEach((b) => b.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', (olay) => {
        if (olay.target === dialog) dialog.close(); // arka plana tıklayınca kapat
    });

    // Giriş yapılınca (veya sayfa açıldığında oturum varsa) listeyi yükle.
    document.addEventListener('yonetim:giris', listeyiYukle);
})();
