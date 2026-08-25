import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole, signToken, setSessionCookie } from '../middleware/auth.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

router.post('/rsvp', (req: Request, res: Response) => {
  const { name, email, num_people, invite_code } = req.body

  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email son requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' })
  }

  const people = num_people ? parseInt(num_people, 10) : 0
  if (num_people && (isNaN(people) || people < 0 || people > 10)) {
    return res.status(400).json({ error: 'Número de acompañantes inválido (0–10)' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM guests WHERE email = ?', [email])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Este email ya está registrado' })
  }

  let accessCode: string
  let attempts = 0
  do {
    accessCode = generateCode()
    attempts++
  } while (attempts < 10)

  db.run(
    'INSERT INTO guests (name, email, num_people, access_code, invite_code) VALUES (?, ?, ?, ?, ?)',
    [name.trim(), email.trim().toLowerCase(), people || 0, accessCode, invite_code || null]
  )
  saveDb()

  res.status(201).json({ success: true, access_code: accessCode })
})

router.post('/login', (req: Request, res: Response) => {
  const { access_code } = req.body
  if (!access_code) {
    return res.status(400).json({ error: 'Código de acceso requerido' })
  }

  const db = getDb()
  const rows = db.exec('SELECT id, name, email FROM guests WHERE access_code = ?', [access_code.trim().toUpperCase()])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(401).json({ error: 'Código inválido' })
  }

  const cols = rows[0].columns
  const vals = rows[0].values[0]
  const guest: Record<string, any> = {}
  cols.forEach((c, i) => (guest[c] = vals[i]))

  const token = signToken({ id: guest.id, email: guest.email, name: guest.name, role: 'guest' })
  setSessionCookie(res, token)
  res.json({ user: { id: guest.id, name: guest.name, email: guest.email, role: 'guest' } })
})

router.get('/validate-access-code', (req: Request, res: Response) => {
  const { access_code } = req.query
  if (!access_code || typeof access_code !== 'string') {
    return res.json({ valid: false })
  }

  const db = getDb()
  const rows = db.exec('SELECT name FROM guests WHERE access_code = ?', [access_code.trim().toUpperCase()])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.json({ valid: false })
  }

  const name = rows[0].values[0][0] as string
  res.json({ valid: true, name })
})

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, name, email, num_people, access_code, created_at FROM guests ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

router.get('/teams', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec(`
    SELECT id, name, sandwich_name, captain_email, members, status, open_to_join
    FROM teams
    WHERE status IN ('approved', 'confirmed') AND open_to_join = 1
    ORDER BY name
  `)
  const teams = rowsToArray(rows).map((t) => ({
    ...t,
    members: JSON.parse((t.members as string) || '[]'),
    open_to_join: Boolean(t.open_to_join),
  })).filter(t => t.members.length < 3)
  res.json(teams)
})

export default router
