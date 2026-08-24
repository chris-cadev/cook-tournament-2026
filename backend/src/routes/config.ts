import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function rowsToObject(rows: any[]): Record<string, any> {
  if (rows.length === 0 || rows[0].values.length === 0) return {}
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

router.get('/', (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec(`
    SELECT event_date, event_title, event_description, rules,
           scoring_categories, landing_page_content, revealed_categories
    FROM event_config WHERE id = 1
  `)

  const config = rowsToObject(rows)

  if (!Object.keys(config).length) {
    return res.json({
      event_date: null,
      event_title: 'The Crust Competition 2026',
      event_description: '',
      rules: '',
      scoring_categories: [],
      landing_page_content: '',
      revealed_categories: [],
    })
  }

  res.json({
    ...config,
    scoring_categories: JSON.parse((config.scoring_categories as string) || '[]'),
    revealed_categories: JSON.parse((config.revealed_categories as string) || '[]'),
  })
})

router.put('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const {
    event_date,
    event_title,
    event_description,
    rules,
    scoring_categories,
    judge_password,
    team_password,
    landing_page_content,
  } = req.body

  const db = getDb()

  const existing = db.exec('SELECT id FROM event_config WHERE id = 1')
  if (existing.length === 0 || existing[0].values.length === 0) {
    const judgeHash = judge_password ? bcrypt.hashSync(judge_password, 10) : null
    const teamHash = team_password ? bcrypt.hashSync(team_password, 10) : null
    db.run(
      `INSERT INTO event_config (id, event_date, event_title, event_description, rules, scoring_categories, judge_password, team_password, landing_page_content)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_date || null,
        event_title || 'The Crust Competition 2026',
        event_description || '',
        rules || '',
        JSON.stringify(scoring_categories || []),
        judgeHash,
        teamHash,
        landing_page_content || '',
      ]
    )
  } else {
    const updates: string[] = []
    const params: any[] = []

    if (event_date !== undefined) { updates.push('event_date = ?'); params.push(event_date) }
    if (event_title !== undefined) { updates.push('event_title = ?'); params.push(event_title) }
    if (event_description !== undefined) { updates.push('event_description = ?'); params.push(event_description) }
    if (rules !== undefined) { updates.push('rules = ?'); params.push(rules) }
    if (scoring_categories !== undefined) { updates.push('scoring_categories = ?'); params.push(JSON.stringify(scoring_categories)) }
    if (judge_password !== undefined) { updates.push('judge_password = ?'); params.push(bcrypt.hashSync(judge_password, 10)) }
    if (team_password !== undefined) { updates.push('team_password = ?'); params.push(bcrypt.hashSync(team_password, 10)) }
    if (landing_page_content !== undefined) { updates.push('landing_page_content = ?'); params.push(landing_page_content) }

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")')
      params.push(1)
      db.run(`UPDATE event_config SET ${updates.join(', ')} WHERE id = ?`, params)
    }
  }

  saveDb()
  res.json({ ok: true })
})

export default router
