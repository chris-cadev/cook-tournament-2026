import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { signToken, setSessionCookie, SESSION_COOKIE_NAME } from '../middleware/auth.js'
import { getDb, saveDb } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

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
  setSessionCookie(res, token)
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: 'admin' } })
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

  const token = signToken({ team_id: team.id, team_slug: team.slug, name: team.name, role: 'team' })
  setSessionCookie(res, token)
  res.json({ team: { id: team.id, slug: team.slug, name: team.name, sandwich_name: team.sandwich_name, role: 'team' } })
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
  setSessionCookie(res, token)
  res.json({ judge: { anonymous_id: anonymousId, role: 'judge' } })
})

router.get('/invite/:code', (req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(
    db.exec('SELECT code, role, team_id, uses, max_uses FROM invites WHERE code = ?', [req.params.code])
  )
  if (!row) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  if (row.max_uses && row.uses >= row.max_uses) {
    return res.status(400).json({ error: 'Invite has reached maximum uses' })
  }
  res.json({ code: row.code, role: row.role, team_id: row.team_id })
})

router.post('/invite/:code/accept', (req: Request, res: Response) => {
  const db = getDb()
  const row = rowsToObject(
    db.exec('SELECT code, role, team_id, uses, max_uses FROM invites WHERE code = ?', [req.params.code])
  )
  if (!row) {
    return res.status(404).json({ error: 'Invite not found' })
  }
  if (row.max_uses && row.uses >= row.max_uses) {
    return res.status(400).json({ error: 'Invite has reached maximum uses' })
  }

  db.run("UPDATE invites SET uses = uses + 1, used_by = ?, used_at = datetime('now') WHERE code = ?", [req.body.name || 'anonymous', req.params.code])
  saveDb()

  res.json({ ok: true, role: row.role, team_id: row.team_id })
})

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

router.get('/me', (req: Request, res: Response) => {
  const cookies = parseCookies(req.headers.cookie)
  const token = cookies[SESSION_COOKIE_NAME]

  if (!token) {
    return res.status(401).json({ error: 'No session' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id?: number; email?: string; team_id?: number; team_slug?: string; name?: string; anonymous_id?: string; role: string }
    
    const db = getDb()
    let user = null

    if (payload.role === 'admin') {
      const rows = db.exec('SELECT id, email, name FROM users WHERE id = ?', [payload.id])
      if (rows.length > 0 && rows[0].values.length > 0) {
        user = { id: rows[0].values[0][0], email: rows[0].values[0][1], name: rows[0].values[0][2], role: 'admin' }
      }
    } else if (payload.role === 'team') {
      const rows = db.exec('SELECT id, slug, name, sandwich_name FROM teams WHERE id = ?', [payload.team_id])
      if (rows.length > 0 && rows[0].values.length > 0) {
        user = { team_id: rows[0].values[0][0], team_slug: rows[0].values[0][1], name: rows[0].values[0][2], sandwich_name: rows[0].values[0][3], role: 'team' }
      }
    } else if (payload.role === 'judge') {
      user = { anonymous_id: payload.anonymous_id, role: 'judge' }
    } else if (payload.role === 'guest') {
      user = { id: payload.id, name: payload.name, role: 'guest' }
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch {
    return res.status(401).json({ error: 'Invalid session' })
  }
})

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

export default router
