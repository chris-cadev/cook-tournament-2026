import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { validateChannelAccess, requireAdmin } from '../middleware/chat.js'
import { getDb, saveDb } from '../db.js'
import { getIO } from '../socket.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
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

// POST /api/chat/global/messages (public)
router.post('/global/messages', (req: Request, res: Response) => {
  const { sender_name, content, attachment_url, attachment_type } = req.body

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ error: 'Message content is required' })
  }

  if (content.length > 2000) {
    return res.status(400).json({ error: 'Message too long (max 2000 characters)' })
  }

  const name = (sender_name && typeof sender_name === 'string' && sender_name.trim()) || 'Anonymous'
  const db = getDb()

  db.run(
    'INSERT INTO chat_messages (channel, sender_name, sender_role, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?)',
    ['global', name, 'guest', content.trim(), attachment_url || null, attachment_type || null]
  )

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]
  const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [id]))
  saveDb()

  try { getIO().to('chat:global').emit('chat:new', { message }) } catch {}

  res.status(201).json({ message })
})

// GET /api/chat/team/:teamId/messages
router.get('/team/:teamId/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const { teamId } = req.params
  const channel = `team:${teamId}`
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

// POST /api/chat/team/:teamId/messages
router.post('/team/:teamId/messages', authMiddleware, validateChannelAccess, (req: Request, res: Response) => {
  const { teamId } = req.params
  const channel = `team:${teamId}`
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
      channel,
      user.id || user.team_id || null,
      user.name || user.email || user.anonymous_id || 'Unknown',
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

  try { getIO().to(`chat:${channel}`).emit('chat:new', { message }) } catch {}

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

  try { getIO().to('chat:judge').emit('chat:new', { message }) } catch {}

  res.status(201).json({ message })
})

// GET /api/chat/teams (admin: list teams for moderation)
router.get('/teams', authMiddleware, requireAdmin, (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT id, name FROM teams ORDER BY name')
  res.json({ teams: rowsToArray(rows) })
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
