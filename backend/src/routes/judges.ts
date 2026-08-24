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

function rowsToObject(rows: any[]): Record<string, any> {
  if (rows.length === 0 || rows[0].values.length === 0) return {}
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

router.get('/teams', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT id, name, sandwich_name FROM teams ORDER BY name')
  res.json(rowsToArray(rows))
})

router.get('/rubric', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1')
  const config = rowsToObject(rows)
  const raw: any[] = config.scoring_categories ? JSON.parse(config.scoring_categories as string) : []
  const categories = raw.map((c: any) =>
    typeof c === 'string' ? { name: c, description: '' } : c
  )
  res.json({ categories })
})

router.post('/scores', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge') {
    return res.status(403).json({ error: 'Judge role required' })
  }

  const { team_id, scores } = req.body
  if (!team_id || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'team_id and scores array required' })
  }

  for (const s of scores) {
    if (typeof s.value !== 'number' || s.value < 1 || s.value > 10 || !Number.isInteger(s.value)) {
      return res.status(400).json({ error: `Invalid score value for category: ${s.category}. Must be integer 1-10.` })
    }
  }

  const db = getDb()

  for (const s of scores) {
    try {
      db.run(
        'INSERT INTO scores (team_id, judge_anonymous_id, category, value, notes) VALUES (?, ?, ?, ?, ?)',
        [team_id, req.user!.anonymous_id, s.category, s.value, s.notes || null]
      )
    } catch (e: any) {
      if (e.message?.includes('UNIQUE constraint')) {
        return res.status(409).json({ error: `Score already submitted for category: ${s.category}` })
      }
      throw e
    }
  }

  saveDb()
  res.status(201).json({ ok: true })
})

router.get('/scores/:teamId', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const db = getDb()
  let rows
  if (req.user?.role === 'judge') {
    rows = db.exec(
      'SELECT judge_anonymous_id, category, value, notes FROM scores WHERE team_id = ? AND judge_anonymous_id = ? ORDER BY category',
      [req.params.teamId, req.user!.anonymous_id]
    )
  } else {
    rows = db.exec(
      'SELECT judge_anonymous_id, category, value, notes FROM scores WHERE team_id = ? ORDER BY category, judge_anonymous_id',
      [req.params.teamId]
    )
  }
  res.json(rowsToArray(rows))
})

export default router
