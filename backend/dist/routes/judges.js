import { Router } from 'express';
import { getDb, saveDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
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
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return {};
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
router.get('/rubric', authMiddleware, (req, res) => {
    if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Judge or admin access required' });
    }
    const db = getDb();
    const rows = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1');
    const config = rowsToObject(rows);
    const categories = config.scoring_categories ? JSON.parse(config.scoring_categories) : [];
    res.json({ categories });
});
router.post('/scores', authMiddleware, (req, res) => {
    if (req.user?.role !== 'judge') {
        return res.status(403).json({ error: 'Judge role required' });
    }
    const { team_id, scores } = req.body;
    if (!team_id || !Array.isArray(scores)) {
        return res.status(400).json({ error: 'team_id and scores array required' });
    }
    const db = getDb();
    for (const s of scores) {
        try {
            db.run('INSERT INTO scores (team_id, judge_anonymous_id, category, value, notes) VALUES (?, ?, ?, ?, ?)', [team_id, req.user.anonymous_id, s.category, s.value, s.notes || null]);
        }
        catch (e) {
            if (e.message?.includes('UNIQUE constraint')) {
                return res.status(409).json({ error: `Score already submitted for category: ${s.category}` });
            }
            throw e;
        }
    }
    saveDb();
    res.status(201).json({ success: true });
});
router.get('/scores/:teamId', authMiddleware, (req, res) => {
    if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Judge or admin access required' });
    }
    const db = getDb();
    const rows = db.exec('SELECT * FROM scores WHERE team_id = ? ORDER BY category, judge_anonymous_id', [req.params.teamId]);
    res.json(rowsToArray(rows));
});
export default router;
