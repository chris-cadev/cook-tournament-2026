import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

// GET /api/teams/:slug/notes
router.get('/:slug/notes', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const teamRows = db.exec('SELECT id, captain_email FROM teams WHERE slug = ?', [req.params.slug])
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const teamId = teamRows[0].values[0][0]
  const captainEmail = teamRows[0].values[0][1]

  if (req.user?.role !== 'admin' && req.user?.team_id !== teamId) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  const notesRows = db.exec('SELECT content, updated_at FROM team_notes WHERE team_id = ?', [teamId])
  const notes = rowsToObject(notesRows)

  const isCaptain = req.user?.email === captainEmail

  res.json({
    content: notes?.content || '',
    updated_at: notes?.updated_at || null,
    is_captain: isCaptain,
  })
})

// PUT /api/teams/:slug/notes
router.put('/:slug/notes', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const teamRows = db.exec('SELECT id, captain_email FROM teams WHERE slug = ?', [req.params.slug])
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const teamId = teamRows[0].values[0][0]
  const captainEmail = teamRows[0].values[0][1]

  if (req.user?.role !== 'admin' && req.user?.team_id !== teamId) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  if (req.user?.email !== captainEmail && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el capitán puede editar las notas' })
  }

  const { content } = req.body
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content string required' })
  }

  const existing = db.exec('SELECT id FROM team_notes WHERE team_id = ?', [teamId])
  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run('UPDATE team_notes SET content = ?, updated_at = datetime(\'now\') WHERE team_id = ?', [content, teamId])
  } else {
    db.run('INSERT INTO team_notes (team_id, content) VALUES (?, ?)', [teamId, content])
  }
  saveDb()

  res.json({ ok: true })
})

export default router
