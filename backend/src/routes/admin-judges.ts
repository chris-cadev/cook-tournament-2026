import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
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

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec(
    "SELECT id, email, name, anonymous_id, created_at FROM users WHERE role = 'judge' ORDER BY name"
  )
  res.json(rowsToArray(rows))
})

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, email } = req.body
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email required' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hash = bcrypt.hashSync(password, 10)
  const anonymous_id = crypto.randomBytes(8).toString('hex')

  db.run(
    'INSERT INTO users (email, password_hash, name, role, anonymous_id) VALUES (?, ?, ?, ?, ?)',
    [email, hash, name, 'judge', anonymous_id]
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]

  res.status(201).json({ id, email, name, anonymous_id, password })
})

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, email } = req.body
  const db = getDb()

  const existing = db.exec('SELECT id FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Judge not found' })
  }

  db.run(
    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
    [name || null, email || null, req.params.id]
  )
  saveDb()
  res.json({ ok: true })
})

router.post('/:id/regenerate-password', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Judge not found' })
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hash = bcrypt.hashSync(password, 10)
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id])
  saveDb()

  res.json({ password })
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  saveDb()
  res.json({ ok: true })
})

export default router
