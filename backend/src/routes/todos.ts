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
  const rows = db.exec('SELECT * FROM admin_todos ORDER BY sort_order ASC, id ASC')
  res.json(rowsToArray(rows))
})

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { content } = req.body
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Content is required' })
  }
  const db = getDb()
  db.run('INSERT INTO admin_todos (content) VALUES (?)', [content.trim()])
  saveDb()
  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  res.status(201).json({ id, content: content.trim(), completed: 0 })
})

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { content, completed } = req.body
  const db = getDb()
  const existing = db.exec('SELECT id FROM admin_todos WHERE id = ?', [req.params.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Todo not found' })
  }

  if (content !== undefined) {
    db.run('UPDATE admin_todos SET content = ? WHERE id = ?', [content, req.params.id])
  }
  if (completed !== undefined) {
    db.run('UPDATE admin_todos SET completed = ? WHERE id = ?', [completed ? 1 : 0, req.params.id])
  }
  saveDb()
  res.json({ success: true })
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM admin_todos WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ success: true })
})

export default router
