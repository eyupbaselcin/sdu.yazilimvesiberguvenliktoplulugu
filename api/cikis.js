import { onbellekYok, oturumKapat } from './_ortak.js';

export default function handler(req, res) {
    onbellekYok(res);
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ basarili: false });
    }
    oturumKapat(res);
    return res.status(200).json({ basarili: true });
}
