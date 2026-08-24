import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'

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

// POST /api/invite/create — create invite link (public, no auth)
router.post('/create', (req: Request, res: Response) => {
  const { referrer_name } = req.body
  const code = crypto.randomBytes(6).toString('base64url')
  const name = (referrer_name && typeof referrer_name === 'string' && referrer_name.trim()) || 'Guest'

  const db = getDb()
  db.run('INSERT INTO invite_links (code, referrer_name) VALUES (?, ?)', [code, name])
  saveDb()

  const baseUrl = req.headers.origin || `http://localhost:${process.env.PORT || 3000}`
  res.json({ code, url: `${baseUrl}/?ref=${code}` })
})

// GET /api/invite/:code — track invite click (public)
router.get('/:code', (req: Request, res: Response) => {
  const { code } = req.params
  const db = getDb()
  const row = rowsToObject(db.exec('SELECT * FROM invite_links WHERE code = ?', [code]))
  if (!row) {
    return res.status(404).json({ error: 'Invalid invite code' })
  }
  db.run('UPDATE invite_links SET clicks = clicks + 1 WHERE code = ?', [code])
  saveDb()
  res.json({ ok: true, referrer: row.referrer_name })
})

// GET /api/admin/invites — list all invite links (admin)
router.get('/', (req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT code, referrer_name, clicks, created_at FROM invite_links ORDER BY created_at DESC')
  res.json({ invites: rowsToArray(rows) })
})

export default router
