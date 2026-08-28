import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { authMiddleware } from '../middleware/auth.js'
import { validateChannelAccess, requireAdmin } from '../middleware/chat.js'
import { getDb, saveDb } from '../db.js'
import { getIO } from '../socket.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

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
function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

// GET /api/chat/global/messages (public)
router.get('/global/messages', (req: Request, res: Response) => {
  const db = getDb()
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const before = req.query.before as string | undefined

  let rows
  if (before) {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?',
      ['global', before, limit]
    )
  } else {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?',
      ['global', limit]
    )
  }

  const messages = rowsToArray(rows).reverse()
  res.json({ messages })
})

// POST /api/chat/global/messages (public — guests and authenticated)
router.post('/global/messages', (req: Request, res: Response) => {
  const { sender_name, content, attachment_url, attachment_type } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content is required' })
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
  }

  // Try to read token for role — doesn't reject unauthenticated requests
  let user: { id?: number; role?: string; name?: string; email?: string } | undefined
  try {
    const header = req.headers.authorization
    const cookies = parseCookies(req.headers.cookie)
    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookies['session_token'] || null
    if (token) {
      user = jwt.verify(token, JWT_SECRET) as { role?: string; name?: string; email?: string }
    }
  } catch {
    // invalid token — treat as guest
  }

  const name = (sender_name && typeof sender_name === 'string' && sender_name.trim())
    || user?.name
    || user?.email
    || 'Anonymous'
  const role = user?.role || 'guest'
  const db = getDb()

  db.run(
    'INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['global', user?.id || null, name, role, content.trim(), attachment_url || null, attachment_type || null]
  )

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  const rows = db.exec('SELECT * FROM chat_messages WHERE id = ?', [id])
  const message = rowsToObject(rows)

  saveDb()

  if (message) {
    getIO().to('chat:global').emit('chat:message', { message })
    getIO().to('chat:global').emit('chat:new', { message })
  }
  res.status(201).json({ message })
})

// GET /api/chat/team/:teamSlug/messages
router.get('/team/:teamSlug/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const { teamSlug } = req.params
  const channel = `team:${teamSlug}`
  const db = getDb()
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const before = req.query.before as string | undefined

  let rows
  if (before) {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?',
      [channel, before, limit]
    )
  } else {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?',
      [channel, limit]
    )
  }

  const messages = rowsToArray(rows).reverse()
  res.json({ messages })
})

// POST /api/chat/team/:teamSlug/messages
router.post('/team/:teamSlug/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const { teamSlug } = req.params
  const channel = `team:${teamSlug}`
  const { sender_name, content, attachment_url, attachment_type } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content is required' })
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
  }

  const db = getDb()
  const user = req.user!
  const name = (sender_name && typeof sender_name === 'string' && sender_name.trim()) || user.name || user.email || 'Unknown'

  db.run(
    'INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      channel,
      user.id || user.team_id || null,
      name,
      user.role,
      content.trim(),
      attachment_url || null,
      attachment_type || null,
    ]
  )

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [id]))

  saveDb()

  if (message) {
    getIO().to(`chat:${channel}`).emit('chat:message', { message })
    getIO().to(`chat:${channel}`).emit('chat:new', { message })
  }
  res.status(201).json({ message })
})

// GET /api/chat/judge/messages
router.get('/judge/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const db = getDb()
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
  const before = req.query.before as string | undefined

  let rows
  if (before) {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?',
      ['judge', before, limit]
    )
  } else {
    rows = db.exec(
      'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?',
      ['judge', limit]
    )
  }

  const messages = rowsToArray(rows).reverse()
  res.json({ messages })
})

// POST /api/chat/judge/messages
router.post('/judge/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const { content, attachment_url, attachment_type } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content is required' })
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
  }

  const db = getDb()
  const user = req.user!

  db.run(
    'INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      'judge',
      user.id || user.anonymous_id || null,
      user.name || user.anonymous_id || 'Judge',
      user.role,
      content.trim(),
      attachment_url || null,
      attachment_type || null,
    ]
  )

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [id]))

  saveDb()

  if (message) {
    getIO().to('chat:judge').emit('chat:message', { message })
    getIO().to('chat:judge').emit('chat:new', { message })
  }
  res.status(201).json({ message })
})

// GET /api/chat/teams (admin: list teams for moderation)
router.get('/teams', authMiddleware, requireAdmin, (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, slug, name FROM teams ORDER BY name')
  res.json({ teams: rowsToArray(rows) })
})

// DELETE /api/chat/team/:teamSlug/messages/:messageId (admin only)
router.delete('/team/:teamSlug/messages/:messageId', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { messageId } = req.params
  const db = getDb()

  const existing = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [messageId]))
  if (!existing) {
    return res.status(404).json({ error: 'Message not found' })
  }

  db.run('DELETE FROM chat_messages WHERE id = ?', [messageId])
  saveDb()
  res.json({ success: true })
})

// DELETE /api/chat/:channel/messages/:messageId (admin only)
router.delete('/:channel/messages/:messageId', authMiddleware, requireAdmin, (req: Request, res: Response) => {
  const { messageId } = req.params
  const db = getDb()

  const existing = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [messageId]))
  if (!existing) {
    return res.status(404).json({ error: 'Message not found' })
  }

  db.run('DELETE FROM chat_messages WHERE id = ?', [messageId])
  saveDb()
  res.json({ success: true })
})

export default router
