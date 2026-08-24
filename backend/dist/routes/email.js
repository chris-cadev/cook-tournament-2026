import { Router } from 'express';
import { getDb } from '../db.js';
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
async function sendEmail(to, subject, html) {
    const SMTP_HOST = process.env.SMTP_HOST;
    const SMTP_USER = process.env.SMTP_USER;
    const SMTP_PASS = process.env.SMTP_PASS;
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        console.error('SMTP not configured — email not sent');
        return false;
    }
    try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.default.createTransport({
            host: SMTP_HOST,
            port: 587,
            secure: false,
            auth: { user: SMTP_USER, pass: SMTP_PASS },
        });
        await transporter.sendMail({
            from: SMTP_USER,
            to,
            subject,
            html,
        });
        return true;
    }
    catch (err) {
        console.error('Failed to send email:', err);
        return false;
    }
}
router.post('/send-reminders', authMiddleware, requireRole('admin'), async (_req, res) => {
    const db = getDb();
    const teams = rowsToArray(db.exec("SELECT name, captain_email, sandwich_name FROM teams WHERE status = 'confirmed'"));
    if (teams.length === 0) {
        return res.status(404).json({ error: 'No confirmed teams found' });
    }
    const configRows = db.exec('SELECT event_date, event_title FROM event_config WHERE id = 1');
    let eventDate = '';
    let eventTitle = 'El Campeonato de Sándwiches';
    if (configRows.length > 0 && configRows[0].values.length > 0) {
        eventDate = configRows[0].values[0][0] || '';
        eventTitle = configRows[0].values[0][1] || eventTitle;
    }
    const formattedDate = eventDate ? new Date(eventDate).toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'por confirmar';
    let sent = 0;
    let failed = 0;
    for (const team of teams) {
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #944a23;">¡Hola, ${team.name}!</h2>
        <p>Este es un recordatorio del <strong>${eventTitle}</strong>.</p>
        <p><strong>Fecha:</strong> ${formattedDate}</p>
        <p><strong>Su sándwich:</strong> ${team.sandwich_name}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Recuerden traer todos sus ingredientes y equipo de cocina.</p>
      </div>
    `;
        const ok = await sendEmail(team.captain_email, `Recordatorio: ${eventTitle}`, html);
        if (ok)
            sent++;
        else
            failed++;
    }
    res.json({ sent, failed, total: teams.length });
});
export default router;
