import { Router, Request, Response } from 'express'
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
  const rows = db.exec('SELECT * FROM stations ORDER BY name')
  res.json(rowsToArray(rows))
})

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, description } = req.body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Station name is required' })
  }
  const db = getDb()
  const existing = db.exec('SELECT id FROM stations WHERE name = ?', [name.trim()])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Station name already exists' })
  }

  db.run('INSERT INTO stations (name, description) VALUES (?, ?)', [name.trim(), description || null])
  saveDb()
  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  res.status(201).json({ id, name: name.trim(), description: description || null })
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM stations WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ success: true })
})

export default router
