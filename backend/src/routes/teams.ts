import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { slugify, resolveTeamSlug } from '../team-utils.js'

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

router.post('/register', (req: Request, res: Response) => {
  const { name, sandwich_name, captain_email, password, members, equipment_needs, open_to_join } = req.body
  if (!name || !captain_email || !password) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM teams WHERE name = ?', [name])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Team name already taken' })
  }

  const slug = slugify(name)
  const slugExists = db.exec('SELECT id FROM teams WHERE slug = ?', [slug])
  if (slugExists.length > 0 && slugExists[0].values.length > 0) {
    return res.status(409).json({ error: 'Team slug already taken' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase()
  db.run(
    `INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, equipment_needs, access_code, open_to_join)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [name, slug, sandwich_name || '', captain_email, hash, JSON.stringify(members || []), equipment_needs || null, accessCode, open_to_join ? 1 : 0]
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  res.status(201).json({ id, slug, name, sandwich_name, status: 'pending', access_code: accessCode })
})

router.get('/validate-access-code', (req: Request, res: Response) => {
  const { access_code } = req.query
  if (!access_code || typeof access_code !== 'string') {
    return res.json({ valid: false })
  }

  const db = getDb()
  const rows = db.exec('SELECT name FROM teams WHERE access_code = ?', [access_code.trim().toUpperCase()])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.json({ valid: false })
  }

  const name = rows[0].values[0][0] as string
  res.json({ valid: true, name })
})

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, slug, name, sandwich_name, captain_email, members, status, station, registered_at FROM teams ORDER BY name')
  const teams = rowsToArray(rows).map(t => ({ ...t, members: JSON.parse((t.members as string) || '[]') }))
  res.json(teams)
})

router.get('/:slug', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, slug, name, sandwich_name, captain_email, members, status, station, registered_at FROM teams WHERE slug = ?', [req.params.slug])
  const teams = rowsToArray(rows)
  if (teams.length === 0) return res.status(404).json({ error: 'Team not found' })

  const team = teams[0]
  team.members = JSON.parse((team.members as string) || '[]')

  if (req.user?.role !== 'admin' && req.user?.team_id !== team.id) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  res.json(team)
})

router.put('/:slug', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, sandwich_name, status, station, open_to_join } = req.body
  const db = getDb()
  const existing = db.exec('SELECT id FROM teams WHERE slug = ?', [req.params.slug])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  let slugUpdate = null
  if (name) {
    slugUpdate = slugify(name)
    const slugExists = db.exec('SELECT id FROM teams WHERE slug = ? AND slug != ?', [slugUpdate, req.params.slug])
    if (slugExists.length > 0 && slugExists[0].values.length > 0) {
      return res.status(409).json({ error: 'Team slug already taken' })
    }
  }

  db.run(
    'UPDATE teams SET name = COALESCE(?, name), slug = COALESCE(?, slug), sandwich_name = COALESCE(?, sandwich_name), status = COALESCE(?, status), station = COALESCE(?, station), open_to_join = COALESCE(?, open_to_join) WHERE slug = ?',
    [name || null, slugUpdate, sandwich_name || null, status || null, station || null, open_to_join !== undefined ? (open_to_join ? 1 : 0) : null, req.params.slug]
  )
  saveDb()
  res.json({ success: true })
})

router.delete('/:slug', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM teams WHERE slug = ?', [req.params.slug])
  saveDb()
  res.json({ success: true })
})

router.get('/:slug/checklist', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, checklist FROM teams WHERE slug = ?', [req.params.slug])
  const teams = rowsToArray(rows)
  if (teams.length === 0) return res.status(404).json({ error: 'Team not found' })

  const team = teams[0]
  if (req.user?.role !== 'admin' && req.user?.team_id !== team.id) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  res.json({ checklist: JSON.parse((team.checklist as string) || '[]') })
})

router.put('/:slug/checklist', authMiddleware, (req: Request, res: Response) => {
  const { checklist } = req.body
  if (!Array.isArray(checklist)) {
    return res.status(400).json({ error: 'checklist array required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT id FROM teams WHERE slug = ?', [req.params.slug])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  db.run('UPDATE teams SET checklist = ? WHERE slug = ?', [JSON.stringify(checklist), req.params.slug])
  saveDb()
  res.json({ ok: true })
})

// GET /api/teams/:slug/checklist — get team checklist (duplicate handler removed, slug-based)
// PUT /api/teams/:slug/checklist — update team checklist (duplicate handler removed, slug-based)

export default router
