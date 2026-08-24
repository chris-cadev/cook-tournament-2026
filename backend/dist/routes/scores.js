import { Router } from 'express';
import { getDb, saveDb } from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getIO } from '../socket.js';
const router = Router();
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return {};
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
function rowsToArray(rows) {
    if (rows.length === 0)
        return [];
    return rows[0].values.map((vals) => {
        const obj = {};
        rows[0].columns.forEach((c, i) => (obj[c] = vals[i]));
        return obj;
    });
}
router.get('/leaderboard', (_req, res) => {
    const db = getDb();
    const configRows = db.exec('SELECT scoring_categories, revealed_categories FROM event_config WHERE id = 1');
    const config = rowsToObject(configRows);
    const rawCats = config.scoring_categories ? JSON.parse(config.scoring_categories) : [];
    const categories = rawCats.map((c) => typeof c === 'string' ? c : c.name);
    const revealed = config.revealed_categories ? JSON.parse(config.revealed_categories) : [];
    const teamRows = db.exec("SELECT id, name, sandwich_name FROM teams WHERE status != 'disqualified' ORDER BY name");
    const teams = rowsToArray(teamRows);
    const scoreRows = db.exec(`
    SELECT team_id, category, AVG(value) as avg_score, COUNT(*) as judge_count
    FROM scores
    GROUP BY team_id, category
  `);
    const allScores = rowsToArray(scoreRows);
    const scoreMap = new Map();
    for (const row of allScores) {
        scoreMap.set(`${row.team_id}:${row.category}`, row.avg_score);
    }
    const leaderboard = teams.map(team => {
        const categoryScores = {};
        const revealedFlags = {};
        let totalScore = 0;
        for (const cat of categories) {
            const avg = scoreMap.get(`${team.id}:${cat}`) || 0;
            categoryScores[cat] = Math.round(avg * 100) / 100;
            revealedFlags[cat] = revealed.includes(cat);
            totalScore += avg;
        }
        return {
            team_id: team.id,
            team_name: team.name,
            sandwich_name: team.sandwich_name,
            total_score: Math.round(totalScore * 100) / 100,
            category_scores: categoryScores,
            revealed: revealedFlags,
        };
    });
    leaderboard.sort((a, b) => b.total_score - a.total_score);
    res.json({
        leaderboard,
        categories,
        revealed,
    });
});
router.post('/reveal', authMiddleware, requireRole('admin'), (req, res) => {
    const { category } = req.body;
    if (!category) {
        return res.status(400).json({ error: 'category required' });
    }
    const db = getDb();
    const configRows = db.exec('SELECT scoring_categories, revealed_categories FROM event_config WHERE id = 1');
    const config = rowsToObject(configRows);
    if (!config.scoring_categories) {
        return res.status(404).json({ error: 'Event config not found' });
    }
    const rawCats = JSON.parse(config.scoring_categories);
    const categories = rawCats.map((c) => typeof c === 'string' ? c : c.name);
    if (!categories.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
    }
    const revealedList = JSON.parse(config.revealed_categories || '[]');
    if (revealedList.includes(category)) {
        return res.status(400).json({ error: 'Category already revealed' });
    }
    revealedList.push(category);
    db.run('UPDATE event_config SET revealed_categories = ? WHERE id = 1', [JSON.stringify(revealedList)]);
    saveDb();
    const scoreRows = db.exec(`
    SELECT s.team_id, t.name as team_name, t.sandwich_name,
           s.judge_anonymous_id, s.category, s.value, s.notes
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.category = ?
    ORDER BY t.name, s.judge_anonymous_id
  `, [category]);
    const scores = rowsToArray(scoreRows);
    const io = getIO();
    io.emit('score:reveal', { category, scores });
    res.json({ ok: true, revealed_category: category });
});
export default router;
