import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { slugify } from '../team-utils.js'

const router = Router()

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, sandwich_name, captain_email, password, members, equipment_needs, open_to_join } = req.body

  if (!name || !captain_email || !password) {
    return res.status(400).json({ error: 'name, captain_email, and password required' })
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
    `INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, equipment_needs, access_code, open_to_join, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [name, slug, sandwich_name || '', captain_email, hash, JSON.stringify(members || []), equipment_needs || null, accessCode, open_to_join ? 1 : 0]
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  res.status(201).json({ id: idRows[0].values[0][0], slug, name, access_code: accessCode })
})

export default router
