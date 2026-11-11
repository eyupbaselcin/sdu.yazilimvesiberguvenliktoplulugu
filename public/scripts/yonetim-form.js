// Yönetim paneli: sekmeler, kayıt formu düzenleyici ve form yanıtları.
(() => {
    const TUR_ADLARI = {
        kisa: 'Kısa yanıt',
        uzun: 'Paragraf',
        eposta: 'E-posta',
        telefon: 'Telefon',
        secim: 'Çoktan seçmeli (tek)',
        coklu: 'Onay kutuları (çoklu)',
    };
    const SECENEKLI = ['secim', 'coklu'];
    const BASLIKLAR = { etkinlikler: 'Etkinlik listesi', form: 'Kayıt formu', yanitlar: 'Form yanıtları' };

    const $ = (id) => document.getElementById(id);
    const iki = (n) => String(n).padStart(2, '0');

    function mesaj(el, metin, tur) {
        el.textContent = metin || '';
        el.className = `yonetim-durum ${tur || ''}`;
    }

    async function istek(url, secenek = {}) {
        const yanit = await fetch(url, {
            credentials: 'same-origin',
            ...secenek,
            headers: secenek.body ? { 'Content-Type': 'application/json' } : {},
        });
        const veri = await yanit.json().catch(() => ({}));
        if (yanit.status === 401) window.showSection?.(false);
        if (!yanit.ok) throw new Error(veri.mesaj || `İşlem başarısız (${yanit.status}).`);
        return veri;
    }

    // ================= SEKMELER =================
    const sekmeYuklendi = {};
    function sekmeAc(ad) {
        document.querySelectorAll('[data-sekme]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.sekme === ad)));
        document.querySelectorAll('[data-sekme-paneli]').forEach((p) => { p.hidden = p.dataset.sekmePaneli !== ad; });
        document.querySelectorAll('[data-sekme-dugmesi]').forEach((b) => { b.hidden = b.dataset.sekmeDugmesi !== ad; });
        $('yonetimBaslik').textContent = BASLIKLAR[ad];
        try { sessionStorage.setItem('yonetim_sekme', ad); } catch { /* yok say */ }

        if (ad === 'form' && !sekmeYuklendi.form) { sekmeYuklendi.form = true; formuYukle(); }
        if (ad === 'yanitlar') yanitlariYukle();
    }
    document.querySelectorAll('[data-sekme]').forEach((b) => b.addEventListener('click', () => sekmeAc(b.dataset.sekme)));

    // ================= FORM DÜZENLEYİCİ =================
    const soruListesi = $('soruListesi');
    const formDurum = $('formDurum');
    let sorular = [];
    let degisti = false;

    function degisiklik() {
        degisti = true;
        mesaj(formDurum, 'Kaydedilmemiş değişiklikler var.', '');
    }

    function soruOgesi(soru, sira) {
        const li = document.createElement('li');
        li.className = 'y-soru';

        const satir = document.createElement('div');
        satir.className = 'y-soru-satir';

        const baslik = document.createElement('input');
        baslik.type = 'text';
        baslik.maxLength = 200;
        baslik.value = soru.baslik;
        baslik.placeholder = 'Soru metni';
        baslik.setAttribute('aria-label', `${sira + 1}. soru metni`);
        baslik.addEventListener('input', () => { soru.baslik = baslik.value; degisiklik(); });

        const tur = document.createElement('select');
        tur.setAttribute('aria-label', `${sira + 1}. soru türü`);
        Object.entries(TUR_ADLARI).forEach(([deger, ad]) => tur.add(new Option(ad, deger, false, deger === soru.tur)));
        tur.addEventListener('change', () => {
            soru.tur = tur.value;
            if (SECENEKLI.includes(soru.tur) && !(soru.secenekler || []).length) soru.secenekler = ['Seçenek 1', 'Seçenek 2'];
            degisiklik();
            ciz();
        });

        const baslikAlan = document.createElement('label');
        baslikAlan.className = 'y-alan';
        baslikAlan.append(baslik);
        satir.append(baslikAlan, tur);
        li.append(satir);

        const aciklama = document.createElement('input');
        aciklama.type = 'text';
        aciklama.maxLength = 300;
        aciklama.value = soru.aciklama || '';
        aciklama.placeholder = 'Açıklama (isteğe bağlı)';
        aciklama.className = 'y-soru-aciklama';
        aciklama.addEventListener('input', () => { soru.aciklama = aciklama.value; degisiklik(); });
        const aciklamaAlan = document.createElement('label');
        aciklamaAlan.className = 'y-alan';
        aciklamaAlan.append(aciklama);
        li.append(aciklamaAlan);

        if (SECENEKLI.includes(soru.tur)) {
            const secenekAlan = document.createElement('label');
            secenekAlan.className = 'y-alan';
            secenekAlan.append('Seçenekler ');
            const kucuk = document.createElement('small');
            kucuk.textContent = '(her satır bir seçenek)';
            secenekAlan.append(kucuk);
            const secenekler = document.createElement('textarea');
            secenekler.rows = Math.min(8, Math.max(3, (soru.secenekler || []).length));
            secenekler.value = (soru.secenekler || []).join('\n');
            secenekler.addEventListener('input', () => {
                soru.secenekler = secenekler.value.split('\n').map((s) => s.trim()).filter(Boolean);
                degisiklik();
            });
            secenekAlan.append(secenekler);
            li.append(secenekAlan);
        }

        const alt = document.createElement('div');
        alt.className = 'y-soru-alt';

        const zorunlu = document.createElement('label');
        zorunlu.className = 'y-anahtar';
        const zorunluKutu = document.createElement('input');
        zorunluKutu.type = 'checkbox';
        zorunluKutu.checked = Boolean(soru.zorunlu);
        zorunluKutu.addEventListener('change', () => { soru.zorunlu = zorunluKutu.checked; degisiklik(); });
        const zorunluYazi = document.createElement('span');
        zorunluYazi.textContent = 'Zorunlu';
        zorunlu.append(zorunluKutu, zorunluYazi);

        const dugmeler = document.createElement('div');
        dugmeler.className = 'y-soru-dugmeler';
        const ikonDugme = (ikon, etiket, devreDisi, tiklama, ekSinif = '') => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `y-ikon-btn ${ekSinif}`;
            b.title = etiket;
            b.setAttribute('aria-label', `${sira + 1}. soru: ${etiket}`);
            b.disabled = devreDisi;
            b.innerHTML = `<i class="fa-solid ${ikon}" aria-hidden="true"></i>`;
            b.addEventListener('click', tiklama);
            return b;
        };
        dugmeler.append(
            ikonDugme('fa-arrow-up', 'Yukarı taşı', sira === 0, () => tasi(sira, -1)),
            ikonDugme('fa-arrow-down', 'Aşağı taşı', sira === sorular.length - 1, () => tasi(sira, 1)),
            ikonDugme('fa-copy', 'Kopyala', false, () => {
                const kopya = JSON.parse(JSON.stringify(soru));
                delete kopya.id; // sunucu yeni kimlik verir
                kopya.baslik = `${soru.baslik} (kopya)`;
                sorular.splice(sira + 1, 0, kopya);
                degisiklik();
                ciz();
            }),
            ikonDugme('fa-trash-can', 'Sil', sorular.length === 1, () => {
                if (!confirm(`"${soru.baslik || 'Bu soru'}" silinsin mi? Eski yanıtlardaki cevaplar silinmez.`)) return;
                sorular.splice(sira, 1);
                degisiklik();
                ciz();
            }, 'y-sil-ikon'),
        );

        alt.append(zorunlu, dugmeler);
        li.append(alt);
        return li;
    }

    function tasi(sira, yon) {
        const hedef = sira + yon;
        [sorular[sira], sorular[hedef]] = [sorular[hedef], sorular[sira]];
        degisiklik();
        ciz();
    }

    function ciz() {
        soruListesi.replaceChildren(...sorular.map(soruOgesi));
    }

    function formuDoldur(form) {
        $('formUstBaslikGir').value = form.ustBaslik || '';
        $('formBaslikGir').value = form.baslik || '';
        $('formUyariGir').value = form.uyari || '';
        $('formMaddelerGir').value = (form.maddeler || []).join('\n');
        $('formAcik').checked = form.acik !== false;
        sorular = JSON.parse(JSON.stringify(form.sorular || []));
        degisti = false;
        ciz();
    }

    async function formuYukle() {
        mesaj(formDurum, 'Form yükleniyor…');
        try {
            const { form } = await istek(`/api/form?taze=${Date.now()}`);
            formuDoldur(form);
            mesaj(formDurum, '');
        } catch (hata) {
            mesaj(formDurum, hata.message, 'hata');
        }
    }

    ['formUstBaslikGir', 'formBaslikGir', 'formUyariGir', 'formMaddelerGir'].forEach((id) => $(id).addEventListener('input', degisiklik));
    $('formAcik').addEventListener('change', degisiklik);

    $('soruEkleBtn').addEventListener('click', () => {
        sorular.push({ baslik: '', tur: 'kisa', zorunlu: false });
        degisiklik();
        ciz();
        soruListesi.lastElementChild.querySelector('input').focus();
    });

    $('formKaydetBtn').addEventListener('click', async () => {
        const bos = sorular.findIndex((s) => !String(s.baslik || '').trim());
        if (bos !== -1) {
            mesaj(formDurum, `${bos + 1}. sorunun metni boş olamaz.`, 'hata');
            soruListesi.children[bos].querySelector('input').focus();
            return;
        }
        if (!$('formBaslikGir').value.trim()) {
            mesaj(formDurum, 'Form başlığı boş olamaz.', 'hata');
            $('formBaslikGir').focus();
            return;
        }

        const dugme = $('formKaydetBtn');
        dugme.disabled = true;
        dugme.textContent = 'Kaydediliyor…';
        try {
            const { form } = await istek('/api/form', {
                method: 'PUT',
                body: JSON.stringify({
                    ustBaslik: $('formUstBaslikGir').value,
                    baslik: $('formBaslikGir').value,
                    uyari: $('formUyariGir').value,
                    maddeler: $('formMaddelerGir').value.split('\n'),
                    acik: $('formAcik').checked,
                    sorular,
                }),
            });
            formuDoldur(form);
            mesaj(formDurum, 'Form kaydedildi. Kayıt sayfasında yeni hali görünüyor.', 'basarili');
        } catch (hata) {
            mesaj(formDurum, hata.message, 'hata');
        } finally {
            dugme.disabled = false;
            dugme.textContent = 'Formu kaydet';
        }
    });

    window.addEventListener('beforeunload', (olay) => {
        if (degisti) olay.preventDefault();
    });

    // ================= YANITLAR =================
    let yanitlar = [];
    let sutunlar = [];

    const zamanGoster = (iso) => new Date(iso).toLocaleString('tr-TR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const cevapMetni = (c) => (Array.isArray(c) ? c.join(', ') : String(c ?? ''));

    function sutunlariBelirle() {
        // Sütunlar: yanıtlarda geçen tüm sorular, soru kimliğine göre (soru metni sonradan değişse de aynı sütun).
        const harita = new Map();
        [...yanitlar].reverse().forEach((y) => y.cevaplar.forEach((c) => harita.set(c.soruId, c.soru)));
        sutunlar = [...harita].map(([id, baslik]) => ({ id, baslik }));
    }

    function yanitHucresi(yanit, soruId) {
        const c = yanit.cevaplar.find((x) => x.soruId === soruId);
        return c ? cevapMetni(c.cevap) : '';
    }

    function yanitlariCiz() {
        const aranan = $('yanitAra').value.trim().toLocaleLowerCase('tr');
        const bugun = new Date();
        const bugunMetni = `${bugun.getFullYear()}-${iki(bugun.getMonth() + 1)}-${iki(bugun.getDate())}`;
        const yerelTarih = (iso) => { const d = new Date(iso); return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`; };

        $('ozetYanit').textContent = iki(yanitlar.length);
        $('ozetBugun').textContent = iki(yanitlar.filter((y) => yerelTarih(y.zaman) === bugunMetni).length);
        $('ozetSon').textContent = yanitlar.length ? zamanGoster(yanitlar[0].zaman) : '—';
        const sayac = $('yanitSayaci');
        sayac.hidden = !yanitlar.length;
        sayac.textContent = yanitlar.length;

        const basliklar = ['#', 'Tarih', ...sutunlar.map((s) => s.baslik), ''];
        $('yanitBasliklar').replaceChildren(...basliklar.map((b) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.textContent = b;
            return th;
        }));

        const tablo = $('yanitTablosu');
        const bosSatir = (metin) => {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = basliklar.length;
            td.className = 'yonetim-bos';
            td.textContent = metin;
            tr.append(td);
            return tr;
        };

        if (!yanitlar.length) {
            tablo.replaceChildren(bosSatir('Henüz yanıt yok.'));
            return;
        }

        const satirlar = yanitlar
            .map((y, i) => ({ y, no: yanitlar.length - i }))
            .filter(({ y }) => !aranan || y.cevaplar.some((c) => cevapMetni(c.cevap).toLocaleLowerCase('tr').includes(aranan)))
            .map(({ y, no }) => {
                const tr = document.createElement('tr');
                [String(no), zamanGoster(y.zaman), ...sutunlar.map((s) => yanitHucresi(y, s.id))].forEach((deger) => {
                    const td = document.createElement('td');
                    td.textContent = deger;
                    tr.append(td);
                });
                const td = document.createElement('td');
                const sil = document.createElement('button');
                sil.type = 'button';
                sil.className = 'y-ikon-btn y-sil-ikon';
                sil.title = 'Yanıtı sil';
                sil.setAttribute('aria-label', `${no}. yanıtı sil`);
                sil.innerHTML = '<i class="fa-solid fa-trash-can" aria-hidden="true"></i>';
                sil.addEventListener('click', () => yanitSil(y, no, sil));
                td.append(sil);
                tr.append(td);
                return tr;
            });

        tablo.replaceChildren(...(satirlar.length ? satirlar : [bosSatir('Aramayla eşleşen yanıt yok.')]));
    }

    async function yanitlariYukle() {
        mesaj($('yanitDurum'), 'Yanıtlar yükleniyor…');
        try {
            const veri = await istek(`/api/yanitlar?t=${Date.now()}`);
            yanitlar = veri.yanitlar || [];
            sutunlariBelirle();
            yanitlariCiz();
            mesaj($('yanitDurum'), '');
        } catch (hata) {
            mesaj($('yanitDurum'), hata.message, 'hata');
        }
    }

    async function yanitSil(yanit, no, dugme) {
        if (!confirm(`${no}. yanıt kalıcı olarak silinsin mi? Bu geri alınamaz.`)) return;
        dugme.disabled = true;
        try {
            await istek(`/api/yanitlar?id=${encodeURIComponent(yanit.id)}`, { method: 'DELETE' });
            yanitlar = yanitlar.filter((y) => y.id !== yanit.id);
            yanitlariCiz();
            mesaj($('yanitDurum'), 'Yanıt silindi.', 'basarili');
        } catch (hata) {
            dugme.disabled = false;
            mesaj($('yanitDurum'), hata.message, 'hata');
        }
    }

    // Excel'in Türkçe ayarlarıyla doğrudan açılan CSV (noktalı virgül + UTF-8 BOM).
    function csvIndir() {
        if (!yanitlar.length) {
            mesaj($('yanitDurum'), 'İndirilecek yanıt yok.', 'hata');
            return;
        }
        const hucre = (deger) => {
            let s = String(deger ?? '');
            if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // Excel formülü olarak çalışmasın
            return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const satirlar = [
            ['Tarih', ...sutunlar.map((s) => s.baslik)],
            ...[...yanitlar].reverse().map((y) => [zamanGoster(y.zaman), ...sutunlar.map((s) => yanitHucresi(y, s.id))]),
        ];
        const metin = '﻿' + satirlar.map((s) => s.map(hucre).join(';')).join('\r\n');
        const url = URL.createObjectURL(new Blob([metin], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        const b = new Date();
        a.href = url;
        a.download = `form-yanitlari-${b.getFullYear()}-${iki(b.getMonth() + 1)}-${iki(b.getDate())}.csv`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    $('yanitAra').addEventListener('input', yanitlariCiz);
    $('yanitYenileBtn').addEventListener('click', yanitlariYukle);
    $('yanitIndirBtn').addEventListener('click', csvIndir);

    // Giriş yapılınca son açık sekmeye dön.
    document.addEventListener('yonetim:giris', () => {
        let sekme = 'etkinlikler';
        try { sekme = sessionStorage.getItem('yonetim_sekme') || sekme; } catch { /* yok say */ }
        sekmeAc(BASLIKLAR[sekme] ? sekme : 'etkinlikler');
    });
})();
