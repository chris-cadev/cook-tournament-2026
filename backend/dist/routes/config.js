import { Router } from 'express';
import { getDb } from '../db.js';
const router = Router();
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return {};
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
router.get('/', (_req, res) => {
    const db = getDb();
    const rows = db.exec(`
    SELECT event_date, event_title, event_description, rules,
           scoring_categories, landing_page_content, revealed_categories
    FROM event_config WHERE id = 1
  `);
    const config = rowsToObject(rows);
    if (!Object.keys(config).length) {
        return res.json({
            event_date: null,
            event_title: 'The Crust Competition 2026',
            event_description: '',
            rules: '',
            scoring_categories: [],
            landing_page_content: '',
            revealed_categories: [],
        });
    }
    res.json({
        ...config,
        scoring_categories: JSON.parse(config.scoring_categories || '[]'),
        revealed_categories: JSON.parse(config.revealed_categories || '[]'),
    });
});
export default router;
