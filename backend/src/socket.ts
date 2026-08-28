import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import jwt from 'jsonwebtoken'
import { AuthUser } from './middleware/auth.js'
import { getDb, saveDb } from './db.js'
import { resolveTeamSlug } from './team-utils.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const COOKIE_NAME = 'session_token'

const ADJECTIVES = ['Happy', 'Lucky', 'Sunny', 'Cosmic', 'Funky', 'Groovy', 'Witty', 'Brave', 'Clever', 'Swift', 'Calm', 'Bold', 'Keen', 'Warm', 'Wild', 'Proud', 'Jolly', 'Merry', 'Noble', 'Royal']
const ANIMALS = ['Fox', 'Bear', 'Owl', 'Wolf', 'Hawk', 'Lynx', 'Deer', 'Seal', 'Crow', 'Puma', 'Goat', 'Crane', 'Swan', 'Lemur', 'Otter', 'Raven', 'Jaguar', 'Falcon', 'Koala', 'Panda']

function generateGuestName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)]
  const num = Math.floor(10 + Math.random() * 90)
  return `${adj}${animal}${num}`
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
}

let io: Server

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowsToObject(rows: any[]): Record<string, any> | null {
  if (rows.length === 0 || rows[0].values.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj: Record<string, any> = {}
  rows[0].columns.forEach((c: string, i: number) => (obj[c] = rows[0].values[0][i]))
  return obj
}

function validateChannelAccess(user: AuthUser, channel: string): boolean {
  if (channel === 'global') return true

  if (channel.startsWith('team:')) {
    const slug = channel.split(':')[1]
    const teamId = resolveTeamSlug(slug)
    if (teamId === null) return false
    if (user.role === 'admin') return true
    if (user.role === 'team' && user.team_id === teamId) return true
    return false
  }

  if (channel === 'judge') {
    return user.role === 'admin' || user.role === 'judge'
  }

  return false
}

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

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  })

  io.use((socket, next) => {
    let token: string | null = null

    const authHeader = socket.handshake.auth.token
    if (authHeader) {
      token = authHeader
    } else {
      const cookies = parseCookies(socket.handshake.headers.cookie)
      token = cookies[COOKIE_NAME] || null
    }

    if (!token) {
      socket.data.user = { role: 'guest' } as AuthUser
      return next()
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
      socket.data.user = decoded
      next()
    } catch {
      socket.data.user = { role: 'guest' } as AuthUser
      next()
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user as AuthUser

    if (user.role === 'guest' && !user.id) {
      socket.emit('chat:guest-name', { name: generateGuestName() })
    }

    socket.on('chat:join', (data: { channel: string }) => {
      if (!validateChannelAccess(user, data.channel)) {
        socket.emit('chat:error', { error: 'Access denied to this channel' })
        return
      }
      socket.join(`chat:${data.channel}`)
      socket.emit('chat:joined', { channel: data.channel })

      // Emit chat:history with recent messages
      const db = getDb()
      const rows = db.exec(
        'SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT 50',
        [data.channel]
      )
      const history = rowsToArray(rows).reverse()
      socket.emit('chat:history', { channel: data.channel, messages: history })
    })

    socket.on('chat:leave', (data: { channel: string }) => {
      socket.leave(`chat:${data.channel}`)
    })

    socket.on('chat:send', (data: { channel: string; content: string; sender_name?: string; attachment_url?: string; attachment_type?: string }) => {
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

      // Attachment validation: file size and audio duration are validated client-side
      // (MinIO presigned URLs don't support server-side size limits easily)

      const db = getDb()
      const name = (data.sender_name && typeof data.sender_name === 'string' && data.sender_name.trim()) || user.name || user.email || user.anonymous_id || 'Unknown'

      db.run(
        'INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          data.channel,
          user.id || user.team_id || user.anonymous_id || null,
          name,
          user.role,
          data.content.trim(),
          data.attachment_url || null,
          data.attachment_type || null,
        ]
      )

      const idRows = db.exec('SELECT last_insert_rowid() as id')
      const messageId = idRows[0].values[0][0]
      const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [messageId]))

      saveDb()

      if (message) {
        io.to(`chat:${data.channel}`).emit('chat:message', { message })
        io.to(`chat:${data.channel}`).emit('chat:new', { message })
      }
    })

    socket.on('disconnect', () => {}) 
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
