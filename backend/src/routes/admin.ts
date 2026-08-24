import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'
import { isEmailAvailable, sendReminder } from '../email.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

router.get('/email/health', (_req: Request, res: Response) => {
  res.json({ available: isEmailAvailable() })
})

router.post('/send-reminders', authMiddleware, requireRole('admin'), async (_req: Request, res: Response) => {
  if (!isEmailAvailable()) {
    return res.status(503).json({ error: 'Email not configured (SMTP not set)' })
  }

  const db = getDb()
  const rows = db.exec("SELECT name, captain_email, sandwich_name FROM teams WHERE status = 'confirmed'")
  const teams = rowsToArray(rows)

  if (teams.length === 0) {
    return res.json({ sent: 0, message: 'No confirmed teams to notify' })
  }

  let sent = 0
  for (const team of teams) {
    const ok = await sendReminder(
      team.captain_email,
      'Recordatorio: El Campeonato de Sándwiches 2026',
      `<h2>¡Hola ${team.name}!</h2>
       <p>Este es un recordatorio del Campeonato de Sándwiches.</p>
       <p>Tu equipo <strong>${team.name}</strong> está confirmado con el sándwich "<em>${team.sandwich_name}</em>".</p>
       <p>Recuerda traer todos tus ingredientes y equipo de cocina.</p>
       <p>¡Nos vemos pronto!</p>`
    )
    if (ok) sent++
  }

  res.json({ sent, total: teams.length })
})

router.get('/todos', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(db.exec('SELECT content_markdown, updated_at FROM admin_todos WHERE id = 1'))
  res.json({ content_markdown: row?.content_markdown || '', updated_at: row?.updated_at || null })
})

router.put('/todos', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { content_markdown } = req.body
  if (typeof content_markdown !== 'string') {
    return res.status(400).json({ error: 'content_markdown string required' })
  }
  const db = getDb()
  db.run("UPDATE admin_todos SET content_markdown = ?, updated_at = datetime('now') WHERE id = 1", [content_markdown])
  saveDb()
  res.json({ ok: true })
})

router.post('/invites', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { role, team_id } = req.body
  const validRoles = ['guest', 'team']
  const inviteRole = validRoles.includes(role) ? role : 'guest'

  const db = getDb()
  const code = crypto.randomBytes(6).toString('hex')

  db.run(
    'INSERT INTO invites (code, created_by, role, team_id) VALUES (?, ?, ?, ?)',
    [code, req.user!.email || 'admin', inviteRole, team_id || null]
  )
  saveDb()

  const baseUrl = req.headers.origin || `http://${req.headers.host}`
  const inviteUrl = `${baseUrl}/invite/${code}`

  res.status(201).json({ code, invite_url: inviteUrl, role: inviteRole })
})

router.get('/invites', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM invites ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

router.get('/invites/:code/validate', (req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(
    db.exec('SELECT code, role, team_id, used_at FROM invites WHERE code = ?', [req.params.code])
  )
  if (!row) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  if (row.used_at) {
    return res.status(400).json({ error: 'Invite already used' })
  }
  res.json({ code: row.code, role: row.role, team_id: row.team_id })
})

export default router
