import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { sendReminderEmail } from '../email.js';
import { getDb } from '../db.js';
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
// POST /api/admin/send-reminders — send reminder to all registered teams
router.post('/send-reminders', authMiddleware, requireRole('admin'), async (_req, res) => {
    const db = getDb();
    const rows = db.exec('SELECT name, captain_email, sandwich_name FROM teams WHERE status = ? ORDER BY name', ['confirmed']);
    const teams = rowsToArray(rows);
    if (teams.length === 0) {
        return res.json({ ok: true, sent: 0, message: 'No confirmed teams to notify' });
    }
    let sent = 0;
    const errors = [];
    for (const team of teams) {
        try {
            await sendReminderEmail(team.captain_email, 'Recordatorio: The Crust Competition 2026', `<h2>¡Hola, ${team.name}!</h2>
         <p>Este es un recordatorio del Campeonato de Sándwiches 2026.</p>
         <p>Tu sándwich: <strong>${team.sandwich_name}</strong></p>
         <p>Asegúrate de estar preparado para el día del evento. ¡Buena suerte!</p>
         <p>— El Equipo Organizador</p>`);
            sent++;
        }
        catch (err) {
            errors.push(`${team.captain_email}: ${err.message}`);
        }
    }
    res.json({ ok: true, sent, errors: errors.length > 0 ? errors : undefined });
});
// GET /api/admin/email-preview — preview reminder email content
router.get('/email-preview', authMiddleware, requireRole('admin'), (_req, res) => {
    res.json({
        subject: 'Recordatorio: The Crust Competition 2026',
        body: `<h2>¡Hola, [Team Name]!</h2>
           <p>Este es un recordatorio del Campeonato de Sándwiches 2026.</p>
           <p>Tu sándwich: <strong>[Sandwich Name]</strong></p>
           <p>Asegúrate de estar preparado para el día del evento. ¡Buena suerte!</p>
           <p>— El Equipo Organizador</p>`,
    });
});
export default router;
