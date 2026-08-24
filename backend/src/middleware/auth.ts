import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
const COOKIE_NAME = 'session_token'

export interface AuthUser {
  id?: number
  email?: string
  team_id?: number
  team_slug?: string
  name?: string
  anonymous_id?: string
  role: 'admin' | 'team' | 'judge' | 'guest'
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
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

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  let token: string | null = null

  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7)
  } else {
    const cookies = parseCookies(req.headers.cookie)
    token = cookies[COOKIE_NAME] || null
  }

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid authorization' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' })
}

export const SESSION_COOKIE_NAME = COOKIE_NAME

export function setSessionCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 24h
  })
}
