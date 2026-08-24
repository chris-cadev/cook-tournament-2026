import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import { signToken } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'

const router = Router()

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
    return res.status(401).json({ error: 'Invalid password' })
  }

  const judgePasswordHash = configRows[0].values[0][0] as string
  if (!bcrypt.compareSync(password, judgePasswordHash)) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  let anonymousId: string
  let inserted = false
  for (let attempt = 0; attempt < 10; attempt++) {
    const maxRows = db.exec('SELECT MAX(id) FROM judges')
    let nextNum = 1
    if (maxRows.length > 0 && maxRows[0].values[0][0] !== null) {
      nextNum = (maxRows[0].values[0][0] as number) + 1
    }
    anonymousId = `judge_${nextNum}`
    try {
      db.run('INSERT INTO judges (anonymous_id) VALUES (?)', [anonymousId])
      inserted = true
      break
    } catch (e: any) {
      if (!e.message?.includes('UNIQUE constraint')) throw e
    }
  }
  if (!inserted) {
    return res.status(500).json({ error: 'Failed to generate judge ID' })
  }
  saveDb()

  const token = signToken({ anonymous_id: anonymousId!, role: 'judge' })
  res.json({ token, role: 'judge' })
})

export default router
