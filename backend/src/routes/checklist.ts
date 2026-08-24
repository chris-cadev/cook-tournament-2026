import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'

const router = Router()

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

// GET /api/teams/:id/checklist — get team checklist
router.get('/:id/checklist', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id as string
  const user = req.user!

  if (user.role !== 'admin' && (user.role !== 'team' || user.team_id !== parseInt(id, 10))) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const db = getDb()
  const row = rowsToObject(db.exec('SELECT checklist FROM teams WHERE id = ?', [id]))
  if (!row) {
    return res.status(404).json({ error: 'Team not found' })
  }
  const checklist = JSON.parse((row.checklist as string) || '[]')
  res.json({ checklist })
})

// PUT /api/teams/:id/checklist — update team checklist
router.put('/:id/checklist', authMiddleware, (req: Request, res: Response) => {
  const id = req.params.id as string
  const user = req.user!

  if (user.role !== 'admin' && (user.role !== 'team' || user.team_id !== parseInt(id, 10))) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const { checklist } = req.body
  if (!Array.isArray(checklist)) {
    return res.status(400).json({ error: 'checklist must be an array' })
  }

  const db = getDb()
  db.run('UPDATE teams SET checklist = ? WHERE id = ?', [JSON.stringify(checklist), id])
  saveDb()
  res.json({ ok: true })
})

export default router
