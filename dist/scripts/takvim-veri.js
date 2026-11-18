// Panel etkinlikleri iki takvimde de görünür; eski sınav/stant planı korunur.
export async function takvimVerisi() {
    const yil = new Date().getFullYear();
    const aylar = Array.from({ length: 12 }, (_, i) => ({ Ayn_no: i + 1, gunler: [] }));
    let kaynakSayisi = 0;
    try {
        const yanit = await fetch('../data/takvim.json', { cache: 'no-cache' });
        if (!yanit.ok) throw new Error('Takvim planı alınamadı.');
        const veri = await yanit.json();
        if (Number(veri.yil) === yil) {
            for (const ay of veri.aylar || []) {
                const hedef = aylar[Number(ay.Ayn_no) - 1];
                if (hedef) hedef.gunler.push(...Object.values(ay).filter(Array.isArray).flat());
            }
        }
        kaynakSayisi++;
    } catch (hata) { console.warn(hata); }
    try {
        const yanit = await fetch('/api/etkinlikler');
        if (!yanit.ok) throw new Error('Panel etkinlikleri alınamadı.');
        const { etkinlikler } = await yanit.json();
        for (const e of etkinlikler) {
            const [y, ay, gun] = e.tarih.split('-').map(Number);
            if (y !== yil || !aylar[ay - 1]) continue;
            const metin = `${gun} ${e.ad}`;
            if (!aylar[ay - 1].gunler.includes(metin)) aylar[ay - 1].gunler.push(metin);
        }
        kaynakSayisi++;
    } catch (hata) { console.warn(hata); }
    if (!kaynakSayisi) throw new Error('Takvim kaynaklarına ulaşılamadı.');
    return { yil, aylar };
}
