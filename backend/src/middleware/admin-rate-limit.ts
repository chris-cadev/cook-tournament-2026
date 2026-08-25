import { Request, Response, NextFunction } from 'express'

const WINDOW_MS = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 60_000
const MAX_ATTEMPTS = Number(process.env.ADMIN_RATE_LIMIT_MAX) || 5

const attempts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim()
  return req.ip || req.socket.remoteAddress || 'unknown'
}

export function adminRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req)
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && now > entry.resetAt) {
    attempts.delete(ip)
  }

  const current = attempts.get(ip)
  if (current && current.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000)
    res.setHeader('Retry-After', retryAfter)
    return res.status(429).json({ error: `Demasiados intentos. Intenta de nuevo en ${retryAfter}s` })
  }

  next()
}

export function recordFailedAttempt(req: Request) {
  const ip = getClientIp(req)
  const now = Date.now()
  const entry = attempts.get(ip)

  if (entry && now <= entry.resetAt) {
    entry.count++
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }
}

export function resetAttempts(req: Request) {
  const ip = getClientIp(req)
  attempts.delete(ip)
}

export function adminIpWhitelist(req: Request, res: Response, next: NextFunction) {
  const allowed = process.env.ADMIN_ALLOWED_IPS
  if (!allowed || !allowed.trim()) return next()

  const ips = allowed.split(',').map(ip => ip.trim())
  const clientIp = getClientIp(req)

  if (!ips.includes(clientIp)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  next()
}
