import { Router, Request, Response } from 'express'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'
import { loadTemplates, saveTemplates, sendEmail, markdownToHtml } from '../email.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

// GET /api/admin/email/templates
router.get('/templates', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  res.json(loadTemplates())
})

// PUT /api/admin/email/templates/:id
router.put('/templates/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { id } = req.params
  const { name, subject, body, enabled } = req.body

  const templates = loadTemplates()
  const idx = templates.findIndex(t => t.id === id)
  if (idx === -1) return res.status(404).json({ error: 'Template not found' })

  if (name !== undefined) templates[idx].name = name
  if (subject !== undefined) templates[idx].subject = subject
  if (body !== undefined) templates[idx].body = body
  if (enabled !== undefined) templates[idx].enabled = enabled

  saveTemplates(templates)
  res.json(templates[idx])
})

// POST /api/admin/email/send
router.post('/send', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  const { template_id, team_ids } = req.body as { template_id?: string; team_ids?: number[] }

  if (!template_id) return res.status(400).json({ error: 'template_id is required' })

  const templates = loadTemplates()
  const template = templates.find(t => t.id === template_id)
  if (!template) return res.status(404).json({ error: 'Template not found' })

  const db = getDb()

  let recipients: { name: string; email: string; team_name: string; captain_name: string; captain_email: string }[] = []

  if (template_id === 'judge-reminder') {
    // Judges don't have stored emails — send to admin
    const adminRow = db.exec("SELECT email FROM users WHERE role = 'admin' LIMIT 1")
    if (adminRow.length > 0 && adminRow[0].values[0]) {
      recipients = [{ name: 'Admin', email: adminRow[0].values[0][0] as string, team_name: '', captain_name: 'Admin', captain_email: adminRow[0].values[0][0] as string }]
    }
  } else {
    const teamRows = db.exec('SELECT id, name, captain_email, members FROM teams')
    if (teamRows.length === 0) return res.json({ sent: 0, failed: 0, details: [] })

    const allTeams = teamRows[0].values.map(row => ({
      id: row[0] as number,
      name: row[1] as string,
      captain_email: row[2] as string,
      members: row[3] as string,
    }))

    const teams = team_ids && team_ids.length > 0
      ? allTeams.filter(t => team_ids.includes(t.id))
      : allTeams

    recipients = teams.map(t => {
      let captainName = t.captain_email
      try {
        const members = JSON.parse(t.members)
        if (Array.isArray(members) && members.length > 0) captainName = members[0]
      } catch { /* keep email as fallback */ }

      return { name: t.name, email: t.captain_email, team_name: t.name, captain_name: captainName, captain_email: t.captain_email }
    })
  }

  if (recipients.length === 0) {
    return res.json({ sent: 0, failed: 0, details: [] })
  }

  const eventConfig = db.exec('SELECT event_title, event_date FROM event_config LIMIT 1')
  const eventTitle = eventConfig.length > 0 ? (eventConfig[0].values[0][0] as string) : ''
  const eventDate = eventConfig.length > 0 ? (eventConfig[0].values[0][1] as string) : ''

  const results: { email: string; ok: boolean; error?: string }[] = []

  for (const r of recipients) {
    const vars = {
      team_name: r.team_name,
      captain_name: r.captain_name,
      captain_email: r.email,
      event_title: eventTitle,
      event_date: eventDate,
    }

    const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
    const htmlBody = markdownToHtml(template.body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))

    db.run('INSERT INTO email_logs (template_id, recipient_email) VALUES (?, ?)', [template_id, r.email])
    const logIdRows = db.exec('SELECT last_insert_rowid() as id')
    const logId = logIdRows[0].values[0][0] as number

    const result = await sendEmail(r.email, subject, htmlBody, logId)
    results.push({ email: r.email, ...result })
  }

  const sent = results.filter(r => r.ok).length
  const failed = results.filter(r => !r.ok).length

  res.json({ sent, failed, details: results })
})

// POST /api/admin/email/send-reminders — send date-based reminders automatically
router.post('/send-reminders', authMiddleware, requireRole('admin'), async (_req: Request, res: Response) => {
  const db = getDb()
  const configRows = db.exec('SELECT event_date, event_title FROM event_config WHERE id = 1')
  if (configRows.length === 0 || !configRows[0].values[0][0]) {
    return res.status(400).json({ error: 'Event date not configured' })
  }

  const eventDate = new Date(configRows[0].values[0][0] as string)
  const now = new Date()
  const daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const templates = loadTemplates()
  const results: { template: string; sent: number; failed: number }[] = []

  // 3 weeks or less: send preparation reminder to teams
  if (daysUntilEvent <= 21 && daysUntilEvent > 0) {
    const template = templates.find(t => t.id === 'team-reminder' && t.enabled)
    if (template) {
      const teamRows = db.exec('SELECT name, captain_email, members FROM teams')
      const teams = teamRows.length > 0 ? teamRows[0].values.map(row => ({
        name: row[0] as string,
        captain_email: row[1] as string,
        members: row[2] as string,
      })) : []

      let sent = 0, failed = 0
      for (const t of teams) {
        let captainName = t.captain_email
        try {
          const parsed = JSON.parse(t.members)
          if (Array.isArray(parsed) && parsed.length > 0) captainName = parsed[0]
        } catch { /* keep email */ }

        const vars = { team_name: t.name, captain_name: captainName, captain_email: t.captain_email, event_title: configRows[0].values[0][1] as string, event_date: configRows[0].values[0][0] as string }
        const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
        const htmlBody = markdownToHtml(template.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))
        const result = await sendEmail(t.captain_email, subject, htmlBody)
        result.ok ? sent++ : failed++
      }
      results.push({ template: 'team-reminder', sent, failed })
    }
  }

  // 1 week or less: send final announcement to teams + judge reminder to admin
  if (daysUntilEvent <= 7 && daysUntilEvent > 0) {
    const announcement = templates.find(t => t.id === 'general-announcement' && t.enabled)
    if (announcement) {
      const teamRows = db.exec('SELECT name, captain_email, members FROM teams')
      const teams = teamRows.length > 0 ? teamRows[0].values.map(row => ({
        name: row[0] as string,
        captain_email: row[1] as string,
        members: row[2] as string,
      })) : []

      let sent = 0, failed = 0
      for (const t of teams) {
        let captainName = t.captain_email
        try {
          const parsed = JSON.parse(t.members)
          if (Array.isArray(parsed) && parsed.length > 0) captainName = parsed[0]
        } catch { /* keep email */ }

        const vars = { team_name: t.name, captain_name: captainName, captain_email: t.captain_email, event_title: configRows[0].values[0][1] as string, event_date: configRows[0].values[0][0] as string }
        const subject = announcement.subject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
        const htmlBody = markdownToHtml(announcement.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))
        const result = await sendEmail(t.captain_email, subject, htmlBody)
        result.ok ? sent++ : failed++
      }
      results.push({ template: 'general-announcement', sent, failed })
    }

    const judgeReminder = templates.find(t => t.id === 'judge-reminder' && t.enabled)
    if (judgeReminder) {
      const adminRow = db.exec("SELECT email FROM users WHERE role = 'admin' LIMIT 1")
      if (adminRow.length > 0 && adminRow[0].values[0]) {
        const adminEmail = adminRow[0].values[0][0] as string
        const vars = { team_name: '', captain_name: 'Admin', captain_email: adminEmail, event_title: configRows[0].values[0][1] as string, event_date: configRows[0].values[0][0] as string }
        const subject = judgeReminder.subject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
        const htmlBody = markdownToHtml(judgeReminder.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))
        const result = await sendEmail(adminEmail, subject, htmlBody)
        results.push({ template: 'judge-reminder', sent: result.ok ? 1 : 0, failed: result.ok ? 0 : 1 })
      }
    }
  }

  if (results.length === 0) {
    return res.json({ message: 'No reminders to send at this time', days_until_event: daysUntilEvent })
  }

  res.json({ days_until_event: daysUntilEvent, results })
})

// GET /api/email/pixel/:logId — tracking pixel
router.get('/pixel/:logId', (req: Request, res: Response) => {
  const db = getDb()
  const logId = req.params.logId

  db.run(
    "UPDATE email_logs SET open_count = open_count + 1, opened_at = COALESCE(opened_at, datetime('now')) WHERE id = ?",
    [logId]
  )
  saveDb()

  const umamiUrl = process.env.UMAMI_URL
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID
  if (umamiUrl && umamiWebsiteId) {
    const logRows = db.exec('SELECT template_id, recipient_email FROM email_logs WHERE id = ?', [logId])
    if (logRows.length > 0 && logRows[0].values.length > 0) {
      const templateId = logRows[0].values[0][0]
      const recipient = logRows[0].values[0][1]
      fetch(`${umamiUrl}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.UMAMI_API_KEY || ''}` },
        body: JSON.stringify({
          name: 'email_opened',
          data: { template_id: templateId, recipient },
          website_id: umamiWebsiteId,
        }),
      }).catch(() => {})
    }
  }

  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' })
  res.send(pixel)
})

// GET /api/admin/email/schedules
router.get('/schedules', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM email_schedules ORDER BY scheduled_at DESC')
  res.json(rowsToArray(rows))
})

// POST /api/admin/email/schedules
router.post('/schedules', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { template_id, recipient_filter, scheduled_at } = req.body
  if (!template_id || !recipient_filter || !scheduled_at) {
    return res.status(400).json({ error: 'template_id, recipient_filter, and scheduled_at required' })
  }

  const db = getDb()
  db.run(
    'INSERT INTO email_schedules (template_id, recipient_filter, scheduled_at) VALUES (?, ?, ?)',
    [template_id, recipient_filter, scheduled_at]
  )
  saveDb()
  res.status(201).json({ ok: true })
})

// DELETE /api/admin/email/schedules/:id
router.delete('/schedules/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run("DELETE FROM email_schedules WHERE id = ? AND status = 'pending'", [req.params.id])
  saveDb()
  res.json({ ok: true })
})

// GET /api/admin/email/logs
router.get('/logs', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 100')
  res.json(rowsToArray(rows))
})

export default router
