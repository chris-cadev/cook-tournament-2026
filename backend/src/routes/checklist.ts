import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

router.get('/', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'team' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Team or admin access required' })
  }

  const db = getDb()
  const teamId = req.user?.role === 'admin' ? (req.query.team_id as string) : req.user?.team_id

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID required' })
  }

  const rows = db.exec('SELECT * FROM team_checklists WHERE team_id = ? ORDER BY category, id', [teamId])
  res.json(rowsToArray(rows))
})

router.post('/', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'team' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Team or admin access required' })
  }

  const { item, category } = req.body
  if (!item || typeof item !== 'string' || item.trim().length === 0) {
    return res.status(400).json({ error: 'Item text is required' })
  }

  const db = getDb()
  const teamId = req.user?.role === 'admin' ? req.body.team_id : req.user?.team_id

  if (!teamId) {
    return res.status(400).json({ error: 'Team ID required' })
  }

  db.run(
    'INSERT INTO team_checklists (team_id, item, category) VALUES (?, ?, ?)',
    [teamId, item.trim(), category || 'general']
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  res.status(201).json({ id, item: item.trim(), category: category || 'general', completed: 0 })
})

router.put('/:id', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'team' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Team or admin access required' })
  }

  const { completed } = req.body
  const db = getDb()

  db.run('UPDATE team_checklists SET completed = ? WHERE id = ?', [completed ? 1 : 0, req.params.id])
  saveDb()
  res.json({ success: true })
})

router.delete('/:id', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'team' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Team or admin access required' })
  }

  const db = getDb()
  db.run('DELETE FROM team_checklists WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ success: true })
})

export default router
