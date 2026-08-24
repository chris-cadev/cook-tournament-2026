import { Router } from 'express';
import { getDb, saveDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
router.post('/create', authMiddleware, (req, res) => {
    const db = getDb();
    const code = generateCode();
    const created_by = req.user?.email || req.user?.anonymous_id || 'unknown';
    db.run('INSERT INTO invite_links (code, created_by) VALUES (?, ?)', [code, created_by]);
    saveDb();
    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const invite_url = `${baseUrl}/register?invite=${code}`;
    res.status(201).json({ code, invite_url });
});
router.get('/validate/:code', (req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT code FROM invite_links WHERE code = ?', [req.params.code]);
    if (rows.length === 0 || rows[0].values.length === 0) {
        return res.status(404).json({ valid: false, error: 'Invalid invite code' });
    }
    db.run('UPDATE invite_links SET uses = uses + 1 WHERE code = ?', [req.params.code]);
    saveDb();
    res.json({ valid: true });
});
router.get('/', authMiddleware, (req, res) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    const db = getDb();
    const rows = db.exec('SELECT * FROM invite_links ORDER BY created_at DESC');
    if (rows.length === 0)
        return res.json([]);
    const links = rows[0].values.map((vals) => {
        const obj = {};
        rows[0].columns.forEach((c, i) => (obj[c] = vals[i]));
        return obj;
    });
    const baseUrl = req.headers.origin || `${req.protocol}://${req.get('host')}`;
    const result = links.map(link => ({
        ...link,
        invite_url: `${baseUrl}/register?invite=${link.code}`,
    }));
    res.json(result);
});
export default router;
