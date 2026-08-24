import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { AuthUser } from './middleware/auth.js'
import { getDb, saveDb } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

let io: Server

function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

function validateChannelAccess(user: AuthUser | null, channel: string): boolean {
  if (channel === 'global') return true

  if (!user) return false

  if (channel.startsWith('team:')) {
    const channelId = parseInt(channel.split(':')[1], 10)
    if (isNaN(channelId)) return false
    if (user.role === 'admin') return true
    if (user.role === 'team' && user.team_id === channelId) return true
    return false
  }

  if (channel === 'judge') {
    return user.role === 'admin' || user.role === 'judge'
  }

  return false
}

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      socket.data.user = null
      return next()
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
      socket.data.user = decoded
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser | null
    console.log(`Socket connected: ${user?.role || 'anonymous'} (${user?.anonymous_id || user?.team_id || user?.email || 'global'})`)

    socket.on('chat:join', (data: { channel: string }) => {
      if (!validateChannelAccess(user, data.channel)) {
        socket.emit('chat:error', { error: 'Access denied to this channel' })
        return
      }
      socket.join(`chat:${data.channel}`)
      socket.emit('chat:joined', { channel: data.channel })

      const db = getDb()
      const rows = db.exec(
        'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT 50',
        [data.channel]
      )
      const messages = rows.length > 0
        ? rows[0].values.map((vals: any[]) => {
            const obj: Record<string, any> = {}
            rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
            return obj
          }).reverse()
        : []
      socket.emit('chat:history', { channel: data.channel, messages })
    })

    socket.on('chat:leave', (data: { channel: string }) => {
      socket.leave(`chat:${data.channel}`)
    })

    socket.on('chat:message', (data: { channel: string; content: string; sender_name?: string }) => {
      if (!validateChannelAccess(user, data.channel)) {
        socket.emit('chat:error', { error: 'Access denied to this channel' })
        return
      }

      if (!data.content || data.content.trim().length === 0) {
        socket.emit('chat:error', { error: 'Message content is required' })
        return
      }

      if (data.content.length > 2000) {
        socket.emit('chat:error', { error: 'Message too long (max 2000 characters)' })
        return
      }

      const db = getDb()
      const senderName = user
        ? (user.name || user.email || user.anonymous_id || 'Unknown')
        : (data.sender_name || 'Guest')
      const senderRole = user ? user.role : 'guest'

      db.run(
        'INSERT INTO chat_messages (channel, sender_id, sender_anonymous_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?, ?)',
        [
          data.channel,
          user?.id || user?.team_id || null,
          user?.role === 'judge' ? (user.anonymous_id || null) : null,
          senderName,
          senderRole,
          data.content.trim(),
        ]
      )
      saveDb()

      const idRows = db.exec('SELECT last_insert_rowid() as id')
      const messageId = idRows[0].values[0][0]
      const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [messageId]))

      io.to(`chat:${data.channel}`).emit('chat:new', { message })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${user?.role || 'anonymous'}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
