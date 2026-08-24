import { Router } from 'express';
import crypto from 'crypto';
import { getDb, saveDb } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
const router = Router();
function rowsToArray(rows) {
    if (rows.length === 0)
        return [];
    return rows[0].values.map((vals) => {
        const obj = {};
        rows[0].columns.forEach((c, i) => (obj[c] = vals[i]));
        return obj;
    });
}
<<<<<<< HEAD
function generateCode() {
    return crypto.randomBytes(4).toString('hex');
}
router.post('/generate', authMiddleware, requireRole('admin'), (req, res) => {
    const { message, created_by } = req.body;
    const code = generateCode();
    const db = getDb();
    db.run('INSERT INTO invites (code, message, created_by) VALUES (?, ?, ?)', [code, message || null, created_by || null]);
    saveDb();
    res.status(201).json({ code, message: message || null });
});
router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT id, code, message, created_by, uses, created_at FROM invites ORDER BY created_at DESC');
    res.json(rowsToArray(rows));
});
router.get('/:code', (req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT id, code, message, uses FROM invites WHERE code = ?', [req.params.code]);
    const invites = rowsToArray(rows);
    if (invites.length === 0)
        return res.status(404).json({ error: 'Invite not found' });
    res.json(invites[0]);
});
router.post('/:code/track', (req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT id FROM invites WHERE code = ?', [req.params.code]);
    if (rows.length === 0 || rows[0].values.length === 0) {
        return res.status(404).json({ error: 'Invite not found' });
    }
    db.run('UPDATE invites SET uses = uses + 1 WHERE code = ?', [req.params.code]);
    saveDb();
    res.json({ ok: true });
=======
// POST /api/invites/generate — admin creates an invite code
router.post('/generate', authMiddleware, requireRole('admin'), (req, res) => {
    const { role } = req.body;
    const code = crypto.randomBytes(6).toString('base64url');
    const db = getDb();
    db.run('INSERT INTO invite_codes (code, created_by, role) VALUES (?, ?, ?)', [
        code,
        req.user?.email || 'admin',
        role || 'guest',
    ]);
    saveDb();
    const baseUrl = req.headers.origin || `http://${req.headers.host}`;
    res.json({ code, url: `${baseUrl}/?ref=${code}`, role: role || 'guest' });
});
// GET /api/invites — list all invite codes (admin)
router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT id, code, created_by, role, uses, created_at FROM invite_codes ORDER BY created_at DESC');
    res.json(rowsToArray(rows));
});
// GET /api/invites/resolve/:code — public, resolves an invite code
router.get('/resolve/:code', (req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT code, role, uses FROM invite_codes WHERE code = ?', [req.params.code]);
    if (rows.length === 0 || rows[0].values.length === 0) {
        return res.status(404).json({ error: 'Invalid invite code' });
    }
    const invite = rows[0].values[0];
    db.run('UPDATE invite_codes SET uses = uses + 1 WHERE code = ?', [req.params.code]);
    saveDb();
    res.json({ code: invite[0], role: invite[1], uses: invite[2] + 1 });
});
// DELETE /api/invites/:id — admin deletes an invite code
router.delete('/:id', authMiddleware, requireRole('admin'), (req, res) => {
    const db = getDb();
    db.run('DELETE FROM invite_codes WHERE id = ?', [req.params.id]);
    saveDb();
    res.json({ success: true });
>>>>>>> orchestrator/task-7-milestone-7-email-system
});
export default router;
