import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows[0].values.map((vals: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM admin_tasks ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { title, description } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const db = getDb()
  db.run('INSERT INTO admin_tasks (title, description) VALUES (?, ?)', [title, description || ''])
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  res.status(201).json({ id: idRows[0].values[0][0] })
})

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { title, description, status } = req.body
  const db = getDb()

  const existing = db.exec('SELECT id FROM admin_tasks WHERE id = ?', [req.params.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const updates: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const values: any[] = []

  if (title !== undefined) { updates.push('title = ?'); values.push(title) }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (status !== undefined) {
    updates.push('status = ?')
    values.push(status)
    if (status === 'completed') {
      updates.push("completed_at = datetime('now')")
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

  updates.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.run(`UPDATE admin_tasks SET ${updates.join(', ')} WHERE id = ?`, values)
  saveDb()
  res.json({ ok: true })
})

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM admin_tasks WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ ok: true })
})

export default router
