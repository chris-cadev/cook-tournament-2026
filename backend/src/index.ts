import dotenv from 'dotenv'
import path from 'path'

// Find .env by walking up from CWD
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { initSocket } from './socket.js'
import { initDb, getDb, saveDb } from './db.js'
import { runMigrations } from './migrate.js'
import { seedAdmin, seedEventConfig } from './seed.js'
import { sendEmail, markdownToHtml, loadTemplates } from './email.js'

import authRoutes from './routes/auth.js'
import configRoutes from './routes/config.js'
import teamsRoutes from './routes/teams.js'
import judgesRoutes from './routes/judges.js'
import scoresRoutes from './routes/scores.js'
import chatRoutes from './routes/chat.js'
import uploadRoutes from './routes/upload.js'
import adminRoutes from './routes/admin.js'
import emailRoutes from './routes/email.js'
import stationsRoutes from './routes/stations.js'
import invitesRoutes from './routes/invites.js'
import todoRoutes from './routes/todo.js'
import guestsRoutes from './routes/guests.js'
import joinRequestsRoutes from './routes/join-requests.js'
import notesRoutes from './routes/notes.js'
import adminJudgesRoutes from './routes/admin-judges.js'
import adminTasksRoutes from './routes/admin-tasks.js'
import adminTeamsRoutes from './routes/admin-teams.js'

const app = express()
const server = createServer(app)

const frontendPort = process.env.PORT || 3000
app.use(cors({ origin: [`http://localhost:${frontendPort}`, 'http://localhost:5173'], credentials: true }))
app.use(express.json())

initSocket(server)

app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/judges', judgesRoutes)
app.use('/api/scores', scoresRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/email', emailRoutes)
app.use('/api/admin/stations', stationsRoutes)
app.use('/api/invites', invitesRoutes)
app.use('/api/todo', todoRoutes)
app.use('/api/guests', guestsRoutes)
app.use('/api/join-requests', joinRequestsRoutes)
app.use('/api/teams', notesRoutes)
app.use('/api/admin/judges', adminJudgesRoutes)
app.use('/api/admin/tasks', adminTasksRoutes)
app.use('/api/admin/teams', adminTeamsRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

async function start() {
  await initDb()
  runMigrations()
  seedAdmin()
  seedEventConfig()

  const PORT = process.env.BACKEND_PORT || 3001
  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', err)
  process.exit(1)
})

// Email scheduler — check every 60s
setInterval(async () => {
  try {
    const db = getDb()
    const rows = db.exec("SELECT id, template_id, recipient_filter FROM email_schedules WHERE status = 'pending' AND scheduled_at <= datetime('now')")
    if (rows.length === 0 || rows[0].values.length === 0) return

    const templates = loadTemplates()
    for (const row of rows[0].values) {
      const [scheduleId, templateId, recipientFilter] = row
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        db.run("UPDATE email_schedules SET status = 'failed' WHERE id = ?", [scheduleId])
        continue
      }

      let recipientEmails: string[] = []
      if (recipientFilter === 'all_teams') {
        const teamRows = db.exec('SELECT captain_email FROM teams')
        if (teamRows.length > 0) recipientEmails = teamRows[0].values.map(r => r[0] as string)
      } else if (recipientFilter === 'all_judges') {
        const judgeRows = db.exec("SELECT email FROM users WHERE role = 'judge'")
        if (judgeRows.length > 0) recipientEmails = judgeRows[0].values.map(r => r[0] as string)
      }

      for (const email of recipientEmails) {
        db.run('INSERT INTO email_logs (template_id, recipient_email) VALUES (?, ?)', [templateId, email])
        const logIdRows = db.exec('SELECT last_insert_rowid() as id')
        const logId = logIdRows[0].values[0][0] as number

        const vars = { team_name: '', captain_name: '', captain_email: email, event_title: 'The Crust Competition 2026', event_date: '' }
        const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
        const htmlBody = markdownToHtml(template.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))

        await sendEmail(email, subject, htmlBody, logId)
      }

      db.run("UPDATE email_schedules SET status = 'sent' WHERE id = ?", [scheduleId])
    }
    saveDb()
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Email scheduler error:', err)
  }
}, 60_000)
