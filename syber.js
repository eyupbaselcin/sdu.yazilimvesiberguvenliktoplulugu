const komutListesi = document.querySelector('#komut-listesi');

async function komutlariYukle() {
    if (!komutListesi) {
        return;
    }

    try {
        const yanit = await fetch('syber.json');

        if (!yanit.ok) {
            throw new Error(`JSON yüklenemedi: ${yanit.status}`);
        }

        const komutlar = await yanit.json();
        const kategoriler = new Map();

        komutlar.forEach((komut) => {
            if (!kategoriler.has(komut.kategori)) {
                kategoriler.set(komut.kategori, []);
            }

            kategoriler.get(komut.kategori).push(komut);
        });

        komutListesi.replaceChildren();

        kategoriler.forEach((komutlar, kategori) => {
            const grup = document.createElement('section');
            const baslik = document.createElement('h2');
            const liste = document.createElement('ul');

            baslik.className = 'card-title';
            baslik.textContent = kategori;
            liste.className = 'news-list';

            komutlar.forEach(({ komut, aciklama }) => {
                const oge = document.createElement('li');
                const komutMetni = document.createElement('strong');
                const aciklamaMetni = document.createElement('span');

                komutMetni.textContent = komut;
                aciklamaMetni.textContent = aciklama;
                oge.append(komutMetni, aciklamaMetni);
                liste.appendChild(oge);
            });

            grup.append(baslik, liste);
            komutListesi.appendChild(grup);
        });
    } catch (hata) {
        komutListesi.textContent = 'Komutlar yüklenirken bir hata oluştu.';
        console.error(hata);
    }
}

komutlariYukle();
