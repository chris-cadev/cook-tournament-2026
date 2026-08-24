import { Router, Request, Response } from 'express'
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

function generateCode(): string {
  return crypto.randomBytes(4).toString('hex')
}

router.post('/generate', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { message, created_by } = req.body
  const code = generateCode()
  const db = getDb()
  db.run(
    'INSERT INTO invites (code, message, created_by) VALUES (?, ?, ?)',
    [code, message || null, created_by || null]
  )
  saveDb()
  res.status(201).json({ code, message: message || null })
})

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, code, message, created_by, uses, created_at FROM invites ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

router.get('/:code', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, code, message, uses FROM invites WHERE code = ?', [req.params.code])
  const invites = rowsToArray(rows)
  if (invites.length === 0) return res.status(404).json({ error: 'Invite not found' })
  res.json(invites[0])
})

router.post('/:code/track', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id FROM invites WHERE code = ?', [req.params.code])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  db.run('UPDATE invites SET uses = uses + 1 WHERE code = ?', [req.params.code])
  saveDb()
  res.json({ ok: true })
})

export default router
