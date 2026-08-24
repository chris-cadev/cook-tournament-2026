import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { getDb, saveDb } from '../db.js';
const router = Router();
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return null;
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
// GET /api/admin/todo — get todo list
router.get('/', authMiddleware, requireRole('admin'), (_req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT todo_list FROM event_config WHERE id = 1');
    const config = rowsToObject(rows);
    const todo = config ? JSON.parse(config.todo_list || '[]') : [];
    res.json({ todo });
});
// PUT /api/admin/todo — save todo list
router.put('/', authMiddleware, requireRole('admin'), (req, res) => {
    const { todo } = req.body;
    if (!Array.isArray(todo)) {
        return res.status(400).json({ error: 'todo must be an array' });
    }
    const db = getDb();
    db.run('UPDATE event_config SET todo_list = ?, updated_at = datetime(\'now\') WHERE id = 1', [JSON.stringify(todo)]);
    saveDb();
    res.json({ ok: true });
});
export default router;
