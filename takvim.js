const haftaGunleri = [
    "Pzt",
    "Sal",
    "Çar",
    "Per",
    "Cum",
    "Cmt",
    "Paz"
];

const takvim = {
  "yil": 2026,
  "aylar": [
    {
      "Ayn_no": 1,
      "ad": "Ocak",
      "pazartesi": ["5","12","19","26"],
      "Salı": ["6", "13", "20", "27"],
      "Çarşamba": ["7","14", "21","28"],
      "Perşembe": ["1", "8", "15", "22", "29"],
      "Cuma": ["2", "9", "16","23", "30"],
      "Cumartesi": ["3", "10", "17","24","31"],
      "Pazar": ["4", "11", "18","25"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 2,
      "ad": "Şubat",
      "pazartesi": ["2", "9", "16", "23"],
      "Salı": ["3", "10","17","24"],
      "Çarşamba": ["4", "11", "18","25"],
      "Perşembe": ["5", "12","19","26"],
      "Cuma": ["6","13", "20", "27"],
      "Cumartesi": ["7","14", "21", "28"],
      "Pazar": ["1","8","15", "22"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 3,
      "ad": "Mart",
      "pazartesi": ["2", "9","16","23","30"],
      "Salı": ["3", "10", "17", "24", "31"],
      "Çarşamba": ["4","11", "18","25"],
      "Perşembe": ["5", "12","19", "26"],
      "Cuma": ["6", "13", "20", "27"],
      "Cumartesi": ["7","14","21", "28"],
      "Pazar": ["1", "8", "15", "22", "29"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 4,
      "ad": "Nisan",
      "pazartesi": ["6","13","20","27"],
      "Salı": ["7","14","21", "28"],
      "Çarşamba": ["1", "8","15","22","29"],
      "Perşembe": ["2","9", "16", "23","30"],
      "Cuma": ["3","10","17", "24"],
      "Cumartesi": ["4","11", "18","25" ],
      "Pazar": ["5", "12","19","26" ],
      "etkinlikler": []
    },
    {
      "Ayn_no": 5,
      "ad": "Mayıs",
      "pazartesi": ["4","11", "18", "25"],
      "Salı": ["5", "12", "19", "26"],
      "Çarşamba": ["6", "13","20","27" ],
      "Perşembe": ["7", "14","21","28" ],
      "Cuma": ["1","8", "15", "22","29"],
      "Cumartesi": ["2", "9", "16","23", "30"],
      "Pazar": ["3","10", "17", "24", "31"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 6,
      "ad": "Haziran",
      "pazartesi": ["1", "8", "15","22", "29"],
      "Salı": ["2","9", "16", "23", "30"],
      "Çarşamba": ["3","10", "17","24"],
      "Perşembe": ["4", "11","18","25"],
      "Cuma": ["5", "12","19","26"],
      "Cumartesi": ["6","13", "20","27"],
      "Pazar": ["7","14", "21","28"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 7,
      "ad": "Temmuz",
      "pazartesi": ["6","13","20","27"],
      "Salı": ["7","14", "21","28" ],
      "Çarşamba": ["1", "8", "15", "22", "29"],
      "Perşembe": ["2","9", "16","23", "30"],
      "Cuma": ["3", "10","17","24", "31"],
      "Cumartesi": ["4","11","18", "25"],
      "Pazar": ["5", "12","19","26" ],
      "etkinlikler": []
    },
    {
      "Ayn_no": 8,
      "ad": "Ağustos",
      "pazartesi": ["3", "10", "17","24","31"],
      "Salı": ["4", "11","18", "25"],
      "Çarşamba": ["5", "12","19","26"],
      "Perşembe": ["6", "13","20", "27"],
      "Cuma": ["7", "14", "21", "28"],
      "Cumartesi": ["1","8", "15", "22", "29"],
      "Pazar": ["2", "9","16","23", "30"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 9,
      "ad": "Eylül",
      "pazartesi": ["7","14", "21", "28"],
      "Salı": ["1","8","15","22","29" ],
      "Çarşamba": ["2","9", "16","23","30"],
      "Perşembe": ["3", "10", "17","24" ],
      "Cuma": ["4","11","18", "25"],
      "Cumartesi": ["5", "12","19", "26"],
      "Pazar": ["6", "13", "20","27"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 10,
      "ad": "Ekim",
      "pazartesi": ["5 Stant","12","19", "26"],
      "Salı": ["6 Stant","13 Tanışma Etkinliği","20","27"],
      "Çarşamba": ["7 Stant", "14","21","28"],
      "Perşembe": ["1", "8 Stant","15", "22", "29"],
      "Cuma": ["2","9 Stant","16", "23", "30"],
      "Cumartesi": ["3", "10","17","24", "31"],
      "Pazar": ["4", "11","18","25" ],
      "etkinlikler": []
    },
    {
      "Ayn_no": 11,
      "ad": "Kasım",
      "pazartesi": ["2","9", "16","23", "30"],
      "Salı": ["3","10", "17", "24"],
      "Çarşamba": ["4","11", "18", "25"],
      "Perşembe": ["5","12", "19","26"],
      "Cuma": ["6","13","20", "27"],
      "Cumartesi": ["7","14","21","28"],
      "Pazar": ["1","8", "15", "22","29"],
      "etkinlikler": []
    },
    {
      "Ayn_no": 12,
      "ad": "Aralık",
      "pazartesi": ["7", "14", "21", "28"],
      "Salı": ["1", "8", "15","22", "29"],
      "Çarşamba": ["2","9", "16","23","30"],
      "Perşembe": ["3", "10", "17","24","31"],
      "Cuma": ["4","11","18", "25"],
      "Cumartesi": ["5", "12", "19","26"],
      "Pazar": ["6", "13", "20","27"],
      "etkinlikler": []
    }
  ]
};

function takvimHucreOlustur(gun, ay, yil, etkinlik) {
    const hucre = document.createElement("td");
    hucre.className = "day";

    if (gun === 0) {
        return hucre;
    }

    const tarih = new Date(yil, ay - 1, gun);
    const bugun = new Date();
    const gunAlani = document.createElement("span");
    gunAlani.textContent = etkinlik ? `${gun} ${etkinlik}` : gun;
    hucre.appendChild(gunAlani);

    if (etkinlik?.toLocaleLowerCase().includes("stant")) {
        hucre.dataset.dayType = "pink";
    } else if (etkinlik?.toLocaleLowerCase().includes("tanışma")) {
        hucre.dataset.dayType = "green";
    }

    if (
        tarih.getFullYear() === bugun.getFullYear() &&
        tarih.getMonth() === bugun.getMonth() &&
        tarih.getDate() === bugun.getDate()
    ) {
        hucre.classList.add("today");
    }

    return hucre;
}

function takvimiOlustur(takvimVerisi, ay) {
    const takvimBaslik = document.querySelector("#takvim-baslik");
    const takvimAyi = document.querySelector("#takvim-ayi");
    const takvimGunleri = document.querySelector("#takvim-gunleri");

    if (!takvimAyi || !takvimGunleri) {
        return;
    }

    if (takvimBaslik) {
        takvimBaslik.textContent = `${takvimVerisi.yil} Takvimi`;
    }
    takvimAyi.textContent = `${ay.ad} ${takvimVerisi.yil}`;
    takvimGunleri.replaceChildren();

    const gunListeleri = haftaGunleri.map((_, index) => {
        const veriAnahtari = [
            "pazartesi",
            "Salı",
            "Çarşamba",
            "Perşembe",
            "Cuma",
            "Cumartesi",
            "Pazar"
        ][index];

        return ay[veriAnahtari] || [];
    });
    const etkinlikler = new Map();
    const gunNumaralari = gunListeleri.flat().map((gunBilgisi) => {
        const eslesme = String(gunBilgisi).match(/^(\d+)(?:\s+(.+))?$/);

        if (!eslesme) {
            throw new Error(`Geçersiz takvim günü: ${gunBilgisi}`);
        }

        const gunNumarasi = Number(eslesme[1]);
        if (eslesme[2]) {
            etkinlikler.set(gunNumarasi, eslesme[2]);
        }

        return gunNumarasi;
    });
    const toplamGun = ay.toplam_gun || Math.max(...gunNumaralari);
    const ilkGun = new Date(takvimVerisi.yil, ay.Ayn_no - 1, 1).getDay();
    const pazartesiBaslangici = (ilkGun + 6) % 7;
    const haftaSayisi = Math.ceil((pazartesiBaslangici + toplamGun) / 7);
    let gun = 1;

    for (let hafta = 0; hafta < haftaSayisi; hafta += 1) {
        const satir = document.createElement("tr");

        for (let gunIndex = 0; gunIndex < 7; gunIndex += 1) {
            const hucreSirasi = hafta * 7 + gunIndex;
            const gunNumarasi =
                hucreSirasi >= pazartesiBaslangici && gun <= toplamGun ? gun++ : 0;
            satir.appendChild(
                takvimHucreOlustur(
                    gunNumarasi,
                    ay.Ayn_no,
                    takvimVerisi.yil,
                    etkinlikler.get(gunNumarasi)
                )
            );
        }

        takvimGunleri.appendChild(satir);
    }
}

function takvimVerisiniAl() {
    const mevcutAy = new Date().getFullYear() === takvim.yil
        ? new Date().getMonth() + 1
        : 1;
    const ay = takvim.aylar.find((takvimAyi) => takvimAyi.Ayn_no === mevcutAy) || takvim.aylar[0];
    takvimiOlustur(takvim, ay);
}
takvimVerisiniAl();