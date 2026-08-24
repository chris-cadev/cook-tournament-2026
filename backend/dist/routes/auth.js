import { Router } from 'express';
import bcrypt from 'bcrypt';
import { signToken } from '../middleware/auth.js';
import { getDb, saveDb } from '../db.js';
const router = Router();
router.post('/admin/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const db = getDb();
    const rows = db.exec('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0 || rows[0].values.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const cols = rows[0].columns;
    const vals = rows[0].values[0];
    const user = {};
    cols.forEach((c, i) => (user[c] = vals[i]));
    if (!bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ id: user.id, email: user.email, role: 'admin' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'admin' } });
});
router.post('/team/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }
    const db = getDb();
    const rows = db.exec('SELECT * FROM teams WHERE captain_email = ?', [email]);
    if (rows.length === 0 || rows[0].values.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const cols = rows[0].columns;
    const vals = rows[0].values[0];
    const team = {};
    cols.forEach((c, i) => (team[c] = vals[i]));
    if (!bcrypt.compareSync(password, team.password_hash)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken({ team_id: team.id, name: team.name, role: 'team' });
    res.json({ token, team: { id: team.id, name: team.name, sandwich_name: team.sandwich_name, role: 'team' } });
});
router.post('/judge/login', (req, res) => {
    const { password, anonymous_id } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password required' });
    }
    const db = getDb();
    const configRows = db.exec('SELECT judge_password FROM event_config WHERE id = 1');
    if (configRows.length === 0 || configRows[0].values.length === 0) {
        return res.status(401).json({ error: 'Invalid password' });
    }
    const judgePasswordHash = configRows[0].values[0][0];
    if (!bcrypt.compareSync(password, judgePasswordHash)) {
        return res.status(401).json({ error: 'Invalid password' });
    }
    let anonymousId;
    if (anonymous_id) {
        const existingJudge = db.exec('SELECT anonymous_id FROM judges WHERE anonymous_id = ?', [anonymous_id]);
        if (existingJudge.length > 0 && existingJudge[0].values.length > 0) {
            anonymousId = existingJudge[0].values[0][0];
            db.run('UPDATE judges SET accessed_at = CURRENT_TIMESTAMP WHERE anonymous_id = ?', [anonymousId]);
            saveDb();
            const token = signToken({ anonymous_id: anonymousId, role: 'judge' });
            return res.json({ token, role: 'judge', anonymous_id: anonymousId });
        }
    }
    const existingRows = db.exec('SELECT anonymous_id FROM judges ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (existingRows.length > 0 && existingRows[0].values.length > 0) {
        nextNum = parseInt(existingRows[0].values[0][0].split('_')[1]) + 1;
    }
    anonymousId = `judge_${nextNum}`;
    db.run('INSERT INTO judges (anonymous_id) VALUES (?)', [anonymousId]);
    saveDb();
    const token = signToken({ anonymous_id: anonymousId, role: 'judge' });
    res.json({ token, role: 'judge', anonymous_id: anonymousId });
});
export default router;
