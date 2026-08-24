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
  const db = getDb()
  const {
    event_date, event_title, event_description, rules,
    scoring_categories, judge_password, team_password, landing_page_content,
  } = req.body

  const existing = db.exec('SELECT id FROM event_config WHERE id = 1')
  const hasRow = existing.length > 0 && existing[0].values.length > 0

  if (!hasRow) {
    const jp = judge_password ? bcrypt.hashSync(judge_password, 10) : null
    const tp = team_password ? bcrypt.hashSync(team_password, 10) : null
    db.run(
      `INSERT INTO event_config (id, event_date, event_title, event_description, rules, scoring_categories, judge_password, team_password, landing_page_content)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_date || null,
        event_title || 'The Crust Competition 2026',
        event_description || '',
        rules || '',
        JSON.stringify(scoring_categories || []),
        jp,
        tp,
        landing_page_content || '',
      ]
    )
  } else {
    const sets: string[] = []
    const vals: any[] = []
    if (event_date !== undefined) { sets.push('event_date = ?'); vals.push(event_date) }
    if (event_title !== undefined) { sets.push('event_title = ?'); vals.push(event_title) }
    if (event_description !== undefined) { sets.push('event_description = ?'); vals.push(event_description) }
    if (rules !== undefined) { sets.push('rules = ?'); vals.push(rules) }
    if (scoring_categories !== undefined) { sets.push('scoring_categories = ?'); vals.push(JSON.stringify(scoring_categories)) }
    if (landing_page_content !== undefined) { sets.push('landing_page_content = ?'); vals.push(landing_page_content) }
    if (judge_password) { sets.push('judge_password = ?'); vals.push(bcrypt.hashSync(judge_password, 10)) }
    if (team_password) { sets.push('team_password = ?'); vals.push(bcrypt.hashSync(team_password, 10)) }
    if (sets.length > 0) {
      sets.push('updated_at = datetime("now")')
      db.run(`UPDATE event_config SET ${sets.join(', ')} WHERE id = 1`, vals)
    }
  }

  saveDb()
  res.json({ ok: true })
})

export default router
