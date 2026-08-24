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
    const categories = config.scoring_categories ? JSON.parse(config.scoring_categories) : [];
    const revealed = config.revealed_categories ? JSON.parse(config.revealed_categories) : [];
<<<<<<< HEAD
    const revealedMap = {};
    for (const cat of categories) {
        revealedMap[cat] = revealed.includes(cat);
    }
    const teamRows = db.exec("SELECT id, name, sandwich_name FROM teams WHERE status != 'disqualified' ORDER BY name");
=======
    const teamRows = db.exec("SELECT id, name, sandwich_name FROM teams WHERE status != 'deleted' ORDER BY name");
>>>>>>> orchestrator/task-7-milestone-7-email-system
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
        let totalScore = 0;
        for (const cat of categories) {
            const avg = scoreMap.get(`${team.id}:${cat}`) || 0;
            categoryScores[cat] = Math.round(avg * 100) / 100;
            totalScore += avg;
        }
        return {
            team_id: team.id,
            team_name: team.name,
            sandwich_name: team.sandwich_name,
            total_score: Math.round(totalScore * 100) / 100,
            category_scores: categoryScores,
            revealed: { ...revealedMap },
        };
    });
    leaderboard.sort((a, b) => b.total_score - a.total_score);
    res.json(leaderboard);
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
    const categories = JSON.parse(config.scoring_categories);
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
<<<<<<< HEAD
    res.json({ ok: true, revealed_category: category });
=======
    res.json({ ok: true, revealed_category: category, revealed: revealedList });
>>>>>>> orchestrator/task-7-milestone-7-email-system
});
export default router;
