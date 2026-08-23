import { Router, Request, Response } from 'express'
import { getDb } from '../db.js'

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

export default router
