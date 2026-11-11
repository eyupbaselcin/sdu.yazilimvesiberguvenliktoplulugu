(() => {
    const galeri = document.getElementById('galeri');

    const mesajGoster = (metin) => {
        const p = document.createElement('p');
        p.className = 'mesaj';
        p.textContent = metin;
        galeri.replaceChildren(p);
    };

    async function galeriyiYukle() {
        let yanit;
        try {
            yanit = await fetch('/api/galeri', { credentials: 'same-origin' });
        } catch {
            mesajGoster('Sunucuya ulaşılamadı. Lütfen daha sonra tekrar deneyin.');
            return;
        }

        if (yanit.status === 401) {
            window.location.href = 'giris.html?sonra=galeri';
            return;
        }

        if (!yanit.ok) {
            mesajGoster('Galeri yüklenemedi.');
            return;
        }

        const { gorseller } = await yanit.json();
        if (!gorseller.length) {
            mesajGoster('Henüz galeriye fotoğraf eklenmemiş. Görselleri projedeki galeri-private/images klasörüne ekleyip yeniden yayınlayın.');
            return;
        }

        galeri.replaceChildren(...gorseller.map((ad) => {
            const figure = document.createElement('figure');
            const img = document.createElement('img');
            const etiket = document.createElement('figcaption');
            const baslik = ad.replace(/\.[^.]+$/, '');

            img.src = `/api/galeri-gorsel?dosya=${encodeURIComponent(ad)}`;
            img.alt = baslik;
            img.loading = 'lazy';
            img.draggable = false;
            etiket.textContent = baslik;
            figure.append(img, etiket);
            return figure;
        }));
    }

    document.getElementById('cikisBtn').addEventListener('click', async () => {
        try {
            await fetch('/api/cikis', { method: 'POST', credentials: 'same-origin' });
        } finally {
            window.location.href = 'giris.html';
        }
    });

    galeriyiYukle();
})();
