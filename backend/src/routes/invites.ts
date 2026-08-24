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

// POST /api/invites/generate — admin creates an invite code
router.post('/generate', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { role } = req.body as { role?: string }
  const code = crypto.randomBytes(6).toString('base64url')
  const db = getDb()
  db.run('INSERT INTO invite_codes (code, created_by, role) VALUES (?, ?, ?)', [
    code,
    req.user?.email || 'admin',
    role || 'guest',
  ])
  saveDb()

  const baseUrl = req.headers.origin || `http://${req.headers.host}`
  res.json({ code, url: `${baseUrl}/?ref=${code}`, role: role || 'guest' })
})

// GET /api/invites — list all invite codes (admin)
router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, code, created_by, role, uses, created_at FROM invite_codes ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

// GET /api/invites/resolve/:code — public, resolves an invite code
router.get('/resolve/:code', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT code, role, uses FROM invite_codes WHERE code = ?', [req.params.code])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ error: 'Invalid invite code' })
  }
  const invite = rows[0].values[0]
  db.run('UPDATE invite_codes SET uses = uses + 1 WHERE code = ?', [req.params.code])
  saveDb()
  res.json({ code: invite[0], role: invite[1], uses: (invite[2] as number) + 1 })
})

// DELETE /api/invites/:id — admin deletes an invite code
router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM invite_codes WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ success: true })
})

export default router
