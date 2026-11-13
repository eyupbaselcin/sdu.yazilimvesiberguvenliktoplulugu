// GitHub deposuna dosya okuma/yazma. Yönetim panelinden eklenen etkinlikler ve afişler doğrudan
// depoya commit edilir; Vercel her commit'te siteyi yeniden yayınlar. "_" ile başladığı için adres olarak yayınlanmaz.
//
// Ortam değişkenleri:
//   GITHUB_TOKEN  – yalnızca bu depoya "Contents: Read and write" izni olan fine-grained token
//   GITHUB_DEPO   – (isteğe bağlı) sahip/depo, varsayılan aşağıda
//   GITHUB_DAL    – (isteğe bağlı) dal, varsayılan main

const VARSAYILAN_DEPO = 'eyupbaselcin/sdu.yazilimvesiberguvenliktoplulugu';

const temiz = (ad) => String(process.env[ad] || '').trim().replace(/^(['"`])(.*)\1$/s, '$2').trim();

export const githubKuruluMu = () => Boolean(temiz('GITHUB_TOKEN'));
const depo = () => temiz('GITHUB_DEPO') || VARSAYILAN_DEPO;
const dal = () => temiz('GITHUB_DAL') || 'main';

/** Henüz yayınlanmamış (deploy bekleyen) dosyalar için ham GitHub adresi; depo herkese açık olduğu için çalışır. */
export const hamAdres = () => `https://raw.githubusercontent.com/${depo()}/${dal()}`;

export class CakismaHatasi extends Error {}

async function gh(yol, { method = 'GET', govde, ham = false } = {}) {
    const yanit = await fetch(`https://api.github.com/repos/${depo()}${yol}`, {
        method,
        headers: {
            Authorization: `Bearer ${temiz('GITHUB_TOKEN')}`,
            Accept: ham ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'topluluk-yonetim-paneli',
            ...(govde ? { 'Content-Type': 'application/json' } : {}),
        },
        body: govde ? JSON.stringify(govde) : undefined,
        cache: 'no-store',
    });
    if (yanit.status === 422 && method === 'PATCH') throw new CakismaHatasi('Dal bu sırada değişti.');
    if (!yanit.ok) {
        const metin = await yanit.text().catch(() => '');
        const hata = new Error(`GitHub ${method} ${yol} → ${yanit.status}: ${metin.slice(0, 300)}`);
        hata.durum = yanit.status;
        throw hata;
    }
    return ham ? yanit.text() : yanit.json();
}

/** Dalın son commit'ini döner. */
export async function sonCommit() {
    const ref = await gh(`/git/ref/heads/${encodeURIComponent(dal())}`);
    const commit = await gh(`/git/commits/${ref.object.sha}`);
    return { sha: ref.object.sha, agac: commit.tree.sha };
}

/** Bir dosyanın içeriğini (metin) okur. ref verilmezse dalın son hâli okunur. Dosya yoksa null döner. */
export async function dosyaOku(yolu, ref) {
    try {
        return await gh(`/contents/${yolu.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref || dal())}`, { ham: true });
    } catch (hata) {
        if (hata.durum === 404) return null;
        throw hata;
    }
}

/**
 * Birden çok dosyayı tek commit'te yazar/siler.
 * degisiklikler: [{ yol, metin } | { yol, ikili: Buffer } | { yol, sil: true }]
 * Dal arada değiştiyse CakismaHatasi fırlatır (çağıran yeniden dener).
 */
export async function commitYap(temel, degisiklikler, mesaj) {
    const agac = [];
    for (const d of degisiklikler) {
        if (d.sil) {
            agac.push({ path: d.yol, mode: '100644', type: 'blob', sha: null });
        } else if (d.ikili) {
            const blob = await gh('/git/blobs', { method: 'POST', govde: { content: d.ikili.toString('base64'), encoding: 'base64' } });
            agac.push({ path: d.yol, mode: '100644', type: 'blob', sha: blob.sha });
        } else {
            agac.push({ path: d.yol, mode: '100644', type: 'blob', content: d.metin });
        }
    }
    const yeniAgac = await gh('/git/trees', { method: 'POST', govde: { base_tree: temel.agac, tree: agac } });
    const commit = await gh('/git/commits', { method: 'POST', govde: { message: mesaj, tree: yeniAgac.sha, parents: [temel.sha] } });
    await gh(`/git/refs/heads/${encodeURIComponent(dal())}`, { method: 'PATCH', govde: { sha: commit.sha, force: false } });
    return commit.sha;
}
