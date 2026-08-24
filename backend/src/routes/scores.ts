import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { getIO } from '../socket.js'

const router = Router()

function rowsToObject(rows: any[]): Record<string, any> {
  if (rows.length === 0 || rows[0].values.length === 0) return {}
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

router.get('/leaderboard', (_req: Request, res: Response) => {
  const db = getDb()

  const configRows = db.exec('SELECT scoring_categories, revealed_categories FROM event_config WHERE id = 1')
  const config = rowsToObject(configRows)
  const categories: string[] = config.scoring_categories ? JSON.parse(config.scoring_categories as string) : []
  const revealed: string[] = config.revealed_categories ? JSON.parse(config.revealed_categories as string) : []

  const teamRows = db.exec("SELECT id, name, sandwich_name FROM teams WHERE status != 'disqualified' ORDER BY name")
  const teams = rowsToArray(teamRows)

  const scoreRows = db.exec(`
    SELECT team_id, category, AVG(value) as avg_score, COUNT(*) as judge_count
    FROM scores
    GROUP BY team_id, category
  `)
  const allScores = rowsToArray(scoreRows)

  const scoreMap = new Map<string, number>()
  for (const row of allScores) {
    scoreMap.set(`${row.team_id}:${row.category}`, row.avg_score as number)
  }

  const leaderboard = teams.map(team => {
    const categoryScores: Record<string, number> = {}
    let totalScore = 0

    for (const cat of categories) {
      const avg = scoreMap.get(`${team.id}:${cat}`) || 0
      categoryScores[cat] = Math.round(avg * 100) / 100
      totalScore += avg
    }

    return {
      team_id: team.id,
      team_name: team.name,
      sandwich_name: team.sandwich_name,
      total_score: Math.round(totalScore * 100) / 100,
      category_scores: categoryScores,
    }
  })

  leaderboard.sort((a: any, b: any) => b.total_score - a.total_score)

  res.json({
    leaderboard,
    categories,
    revealed,
  })
})

router.post('/reveal', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { category } = req.body
  if (!category) {
    return res.status(400).json({ error: 'category required' })
  }

  const db = getDb()
  const configRows = db.exec('SELECT scoring_categories, revealed_categories FROM event_config WHERE id = 1')
  const config = rowsToObject(configRows)

  if (!config.scoring_categories) {
    return res.status(404).json({ error: 'Event config not found' })
  }

  const categories: string[] = JSON.parse(config.scoring_categories as string)
  if (!categories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' })
  }

  const revealedList: string[] = JSON.parse((config.revealed_categories as string) || '[]')
  if (revealedList.includes(category)) {
    return res.status(400).json({ error: 'Category already revealed' })
  }

  revealedList.push(category)
  db.run('UPDATE event_config SET revealed_categories = ? WHERE id = 1', [JSON.stringify(revealedList)])
  saveDb()

  const scoreRows = db.exec(`
    SELECT s.team_id, t.name as team_name, t.sandwich_name,
           s.judge_anonymous_id, s.category, s.value, s.notes
    FROM scores s
    JOIN teams t ON t.id = s.team_id
    WHERE s.category = ?
    ORDER BY t.name, s.judge_anonymous_id
  `, [category])
  const scores = rowsToArray(scoreRows)

  const io = getIO()
  io.emit('score:reveal', { category, scores })

  res.json({ ok: true, revealed_category: category, revealed: revealedList })
})

export default router
