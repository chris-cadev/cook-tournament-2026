import { Router } from 'express';
import nodemailer from 'nodemailer';
import { authMiddleware, requireRole } from '../middleware/auth.js';
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
router.post('/send-reminders', authMiddleware, requireRole('admin'), async (_req, res) => {
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (!smtpHost || !smtpUser || !smtpPass) {
        return res.status(503).json({ error: 'Email no está configurado (faltan variables SMTP)' });
    }
    const db = getDb();
    const teamRows = db.exec("SELECT name, captain_email FROM teams WHERE status != 'disqualified' ORDER BY name");
    const teams = rowsToArray(teamRows);
    if (teams.length === 0) {
        return res.status(400).json({ error: 'No hay equipos registrados para enviar recordatorios' });
    }
    const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
    });
    let sent = 0;
    let failed = 0;
    for (const team of teams) {
        try {
            await transporter.sendMail({
                from: `"The Crust Competition" <${smtpUser}>`,
                to: team.captain_email,
                subject: 'Recordatorio — The Crust Competition 2026',
                text: `Hola equipo "${team.name}",\n\nEste es un recordatorio sobre el Campeonato de Sándwiches 2026.\n\nAsegúrate de tener todos tus ingredientes y equipo listos.\n\n¡Nos vemos pronto!`,
                html: `<p>Hola equipo <strong>${team.name}</strong>,</p><p>Este es un recordatorio sobre el <strong>Campeonato de Sándwiches 2026</strong>.</p><p>Asegúrate de tener todos tus ingredientes y equipo listos.</p><p>¡Nos vemos pronto!</p>`,
            });
            sent++;
        }
        catch {
            failed++;
        }
    }
    res.json({ ok: true, sent, failed, total: teams.length });
});
export default router;
