import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

router.post('/register', (req: Request, res: Response) => {
  const { name, sandwich_name, captain_email, password, members, equipment_needs } = req.body
  if (!name || !sandwich_name || !captain_email || !password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM teams WHERE name = ?', [name])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Team name already taken' })
  }

  const hash = bcrypt.hashSync(password, 10)
  db.run(
    `INSERT INTO teams (name, sandwich_name, captain_email, password_hash, members, equipment_needs)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, sandwich_name, captain_email, hash, JSON.stringify(members || []), equipment_needs || null]
  )

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  saveDb()
  res.status(201).json({ id, name, status: 'pending' })
})

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, name, sandwich_name, captain_email, members, equipment_needs, status, station, registered_at FROM teams ORDER BY name')
  const teams: Record<string, any>[] = rowsToArray(rows).map(t => ({ ...t, members: JSON.parse((t.members as string) || '[]') }))
  res.json(teams)
})

router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, name, sandwich_name, captain_email, members, equipment_needs, status, station, registered_at FROM teams WHERE id = ?', [req.params.id])
  const teams: Record<string, any>[] = rowsToArray(rows).map(t => ({ ...t, members: JSON.parse((t.members as string) || '[]') }))
  if (teams.length === 0) return res.status(404).json({ error: 'Team not found' })

  const team = teams[0]
  if (req.user?.role !== 'admin' && req.user?.team_id !== team.id) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  res.json(team)
})

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, sandwich_name, status, station } = req.body
  const db = getDb()
  const existing = db.exec('SELECT id FROM teams WHERE id = ?', [req.params.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  db.run(
    'UPDATE teams SET name = COALESCE(?, name), sandwich_name = COALESCE(?, sandwich_name), status = COALESCE(?, status), station = COALESCE(?, station) WHERE id = ?',
    [name || null, sandwich_name || null, status || null, station || null, req.params.id]
  )
  saveDb()
  res.json({ success: true })
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM teams WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ success: true })
})

export default router
