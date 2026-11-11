// Ana sayfadaki takvim kutuları.
// Etkinlikler public/data/takvim.json dosyasından okunur (etkinlikler sayfasıyla aynı kaynak).
// Her kutu hangi ayı göstereceğini kendisi söyler:
//   <div class="calendar-wrap" data-takvim-ay="bugun">              → içinde bulunulan ay
//   <div class="calendar-wrap" data-takvim-ay="2026-12" data-takvim-vurgu="14"> → Aralık 2026, 14'ü vurgulu
(() => {
    const kutular = document.querySelectorAll('[data-takvim-ay]');
    if (!kutular.length) return;

    // "14 Lojik 1" ve "14 - Lojik 1" biçimlerinin ikisi de kabul edilir; yalnız "14" etkinlik değildir.
    const GUN_DESENI = /^(\d+)(?:\s+[-–—]?|\s*[-–—])\s*(\S.*)$/;

    // Sınav ve stant günleri pembe, diğer etkinlikler yeşil.
    const etkinlikTuru = (ad) => (/vize|final|sınav|stant/.test(ad.toLocaleLowerCase('tr')) ? 'pink' : 'green');

    function ayinEtkinlikleri(veri, ayNo) {
        const ay = (veri.aylar || []).find((a) => Number(a.Ayn_no) === ayNo);
        if (!ay) return { ad: null, etkinlikler: [] };

        const etkinlikler = Object.values(ay)
            .filter(Array.isArray)
            .flat()
            .map((gunBilgisi) => String(gunBilgisi).match(GUN_DESENI))
            .filter(Boolean)
            .map((e) => ({ gun: Number(e[1]), ad: e[2] }))
            .sort((a, b) => a.gun - b.gun);

        return { ad: ay.ad, etkinlikler };
    }

    function kutuyuCiz(kutu, veri) {
        const baslik = kutu.querySelector('[data-takvim-baslik]');
        const ayYazisi = kutu.querySelector('[data-takvim-ayi]');
        const liste = kutu.querySelector('[data-takvim-gunleri]');
        const bugun = new Date();

        let yil = bugun.getFullYear();
        let ayNo = bugun.getMonth() + 1;
        const istenen = kutu.dataset.takvimAy;
        if (/^\d{4}-\d{2}$/.test(istenen)) {
            [yil, ayNo] = istenen.split('-').map(Number);
        }
        const vurgulanan = Number(kutu.dataset.takvimVurgu) || null;

        const ayAdi = new Date(yil, ayNo - 1, 1).toLocaleDateString('tr-TR', { month: 'long' });
        const buyukAyAdi = ayAdi.charAt(0).toLocaleUpperCase('tr') + ayAdi.slice(1);
        if (baslik) baslik.textContent = `${buyukAyAdi} ${yil} Etkinlikleri`;
        if (ayYazisi) ayYazisi.textContent = istenen === 'bugun' ? 'Bu ay' : buyukAyAdi;

        // takvim.json yalnızca kendi yılını içerir.
        const { etkinlikler } = Number(veri.yil) === yil ? ayinEtkinlikleri(veri, ayNo) : { etkinlikler: [] };

        if (!etkinlikler.length) {
            const bos = document.createElement('li');
            bos.className = 'calendar-events__empty';
            bos.textContent = 'Bu ay için planlanmış etkinlik bulunmuyor.';
            liste.replaceChildren(bos);
            return;
        }

        liste.replaceChildren(...etkinlikler.map(({ gun, ad }) => {
            const li = document.createElement('li');
            li.className = 'calendar-event';
            li.dataset.dayType = etkinlikTuru(ad);

            const bugunMu = yil === bugun.getFullYear() && ayNo === bugun.getMonth() + 1 && gun === bugun.getDate();
            if (bugunMu || gun === vurgulanan) {
                li.classList.add('today');
            }

            const tarih = document.createElement('span');
            tarih.className = 'calendar-event__date';
            const gunAdi = new Date(yil, ayNo - 1, gun).toLocaleDateString('tr-TR', { weekday: 'long' });
            tarih.textContent = `${gun} ${buyukAyAdi} ${gunAdi}${bugunMu ? ' • Bugün' : ''}`;

            const adAlani = document.createElement('span');
            adAlani.className = 'calendar-event__name';
            adAlani.textContent = ad;

            li.append(tarih, adAlani);
            return li;
        }));
    }

    async function yukle() {
        try {
            const yanit = await fetch('../data/takvim.json', { cache: 'no-cache' });
            if (!yanit.ok) throw new Error(`takvim.json yüklenemedi: ${yanit.status}`);
            const veri = await yanit.json();
            kutular.forEach((kutu) => kutuyuCiz(kutu, veri));
        } catch (hata) {
            console.error(hata);
            kutular.forEach((kutu) => {
                const baslik = kutu.querySelector('[data-takvim-baslik]');
                if (baslik) baslik.textContent = 'Takvim yüklenemedi';
                const liste = kutu.querySelector('[data-takvim-gunleri]');
                const li = document.createElement('li');
                li.className = 'calendar-events__empty';
                li.textContent = 'Takvim şu anda yüklenemedi. Lütfen sayfayı yenileyin.';
                liste.replaceChildren(li);
            });
        }
    }

    yukle();
})();
