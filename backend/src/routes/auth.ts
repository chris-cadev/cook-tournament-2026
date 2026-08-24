import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { signToken } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'

const router = Router()

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

router.post('/admin/login', (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT * FROM users WHERE email = ?', [email])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const cols = rows[0].columns
  const vals = rows[0].values[0]
  const user: Record<string, any> = {}
  cols.forEach((c, i) => (user[c] = vals[i]))

  if (!bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = signToken({ id: user.id, email: user.email, role: 'admin' })
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: 'admin' } })
})

router.post('/team/login', (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  const db = getDb()
  const rows = db.exec('SELECT * FROM teams WHERE captain_email = ?', [email])
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const cols = rows[0].columns
  const vals = rows[0].values[0]
  const team: Record<string, any> = {}
  cols.forEach((c, i) => (team[c] = vals[i]))

  if (!bcrypt.compareSync(password, team.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = signToken({ team_id: team.id, name: team.name, role: 'team' })
  res.json({ token, team: { id: team.id, name: team.name, sandwich_name: team.sandwich_name, role: 'team' } })
})

router.post('/judge/login', (req: Request, res: Response) => {
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  const db = getDb()
  const configRows = db.exec('SELECT judge_password FROM event_config WHERE id = 1')
  if (configRows.length === 0 || configRows[0].values.length === 0) {
    return res.status(401).json({ error: 'Invalid judge password' })
  }

  const judgePasswordHash = configRows[0].values[0][0] as string
  if (!bcrypt.compareSync(password, judgePasswordHash)) {
    return res.status(401).json({ error: 'Invalid judge password' })
  }

  const existingJudge = db.exec('SELECT anonymous_id FROM judges WHERE id IN (SELECT id FROM judges ORDER BY id DESC LIMIT 1)')
  let anonymousId: string

  if (existingJudge.length > 0 && existingJudge[0].values.length > 0) {
    // Check if this IP/session already has a judge identity stored
    // For simplicity, generate sequential IDs but reuse if we can find a pattern
    const allJudges = db.exec('SELECT anonymous_id FROM judges ORDER BY id')
    const usedNums = allJudges.length > 0
      ? allJudges[0].values.map(r => parseInt((r[0] as string).split('_')[1]) || 0)
      : []
    let nextNum = 1
    while (usedNums.includes(nextNum)) nextNum++
    anonymousId = `judge_${nextNum}`
  } else {
    anonymousId = 'judge_1'
  }

  db.run('INSERT INTO judges (anonymous_id) VALUES (?)', [anonymousId])
  saveDb()

  const token = signToken({ anonymous_id: anonymousId, role: 'judge' })
  res.json({ token, judge: { anonymous_id: anonymousId, role: 'judge' } })
})

router.get('/invite/:code', (req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(
    db.exec('SELECT code, role, team_id, used_at FROM invites WHERE code = ?', [req.params.code])
  )
  if (!row) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  if (row.used_at) {
    return res.status(400).json({ error: 'Invite already used' })
  }
  res.json({ code: row.code, role: row.role, team_id: row.team_id })
})

router.post('/invite/:code/accept', (req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(
    db.exec('SELECT code, role, team_id, used_at FROM invites WHERE code = ?', [req.params.code])
  )
  if (!row) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  if (row.used_at) {
    return res.status(400).json({ error: 'Invite already used' })
  }

  db.run("UPDATE invites SET used_by = ?, used_at = datetime('now') WHERE code = ?", [req.body.name || 'anonymous', req.params.code])
  saveDb()

  res.json({ ok: true, role: row.role, team_id: row.team_id })
})

export default router
