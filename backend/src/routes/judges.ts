import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { resolveTeamSlug } from '../team-utils.js'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowsToObject(rows: any[]): Record<string, any> {
  if (rows.length === 0 || rows[0].values.length === 0) return {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

router.get('/teams', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const db = getDb()
  const rows = db.exec(
    'SELECT id, name, sandwich_name, captain_email, members, station, registered_at FROM teams WHERE status = ? ORDER BY registered_at',
    ['confirmed']
  )
  const teams = rowsToArray(rows).map(t => ({ ...t, members: JSON.parse((t.members as string) || '[]') }))

  if (req.user?.role === 'judge') {
    const scoreRows = db.exec(
      'SELECT DISTINCT team_id FROM scores WHERE judge_anonymous_id = ?',
      [req.user!.anonymous_id]
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoredIds = new Set(scoreRows.length > 0 ? scoreRows[0].values.map((v: any[]) => v[0]) : [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    teams.forEach((t: any) => { t.scored = scoredIds.has(t.id) })
  }

  res.json(teams)
})

router.get('/rubric', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT name, weight, max_points, description FROM scoring_categories ORDER BY sort_order, id')
  if (rows.length === 0 || rows[0].values.length === 0) {
    const fallback = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1')
    const config = rowsToObject(fallback)
    const categories = config.scoring_categories ? JSON.parse(config.scoring_categories as string) : []
    return res.json({ categories: categories.map((c: string) => ({ name: c, weight: 1, max_points: 10, description: '' })) })
  }
  const categories = rowsToArray(rows)
  res.json({ categories })
})

router.post('/scores', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge') {
    return res.status(403).json({ error: 'Judge role required' })
  }

  const { team_id, scores } = req.body
  if (!team_id || !Array.isArray(scores) || scores.length === 0) {
    return res.status(400).json({ error: 'team_id and non-empty scores array required' })
  }

  const db = getDb()

  const teamRows = db.exec('SELECT id FROM teams WHERE id = ?', [team_id])
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(400).json({ error: 'Invalid team_id' })
  }

  const configRows = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1')
  const categories: string[] = configRows.length > 0 && configRows[0].values.length > 0
    ? JSON.parse(configRows[0].values[0][0] as string)
    : []

  for (const s of scores) {
    if (!s.category || !categories.includes(s.category)) {
      return res.status(400).json({ error: `Invalid category: ${s.category}` })
    }
    if (typeof s.value !== 'number' || s.value < 1 || s.value > 10 || !Number.isInteger(s.value)) {
      return res.status(400).json({ error: `Score value must be an integer between 1 and 10 (got ${s.value} for ${s.category})` })
    }
  }

  try {
    db.run('BEGIN')
    for (const s of scores) {
      db.run(
        'INSERT INTO scores (team_id, judge_anonymous_id, category, value, notes) VALUES (?, ?, ?, ?, ?)',
        [team_id, req.user!.anonymous_id, s.category, s.value, s.notes || null]
      )
    }
    db.run('COMMIT')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (e: any) {
    db.run('ROLLBACK')
    if (e.message?.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Score already submitted for one or more categories' })
    }
    throw e
  }

  saveDb()
  res.status(201).json({ ok: true })
})

router.get('/scores/:teamIdOrSlug', authMiddleware, (req: Request, res: Response) => {
  if (req.user?.role !== 'judge' && req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Judge or admin access required' })
  }

  const param = req.params.teamIdOrSlug as string
  const teamId = /^\d+$/.test(param) ? parseInt(param, 10) : resolveTeamSlug(param)
  if (teamId === null) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const db = getDb()
  let rows
  if (req.user?.role === 'admin') {
    rows = db.exec(
      'SELECT * FROM scores WHERE team_id = ? ORDER BY category, judge_anonymous_id',
      [teamId]
    )
  } else {
    rows = db.exec(
      'SELECT * FROM scores WHERE team_id = ? AND judge_anonymous_id = ? ORDER BY category',
      [teamId, req.user!.anonymous_id]
    )
  }
  res.json(rowsToArray(rows))
})

export default router
