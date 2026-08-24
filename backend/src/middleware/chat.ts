import { Request, Response, NextFunction } from 'express'
import { resolveTeamSlug } from '../team-utils.js'

export function validateChannelAccess(req: Request, res: Response, next: NextFunction) {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const channel = (req.params.channel as string) || determineChannel(req)

  if (!channel) {
    return res.status(400).json({ error: 'Channel parameter required' })
  }

  if (channel === 'global') {
    return next()
  }

  if (channel.startsWith('team:')) {
    const slug = channel.split(':')[1]
    const teamId = resolveTeamSlug(slug)
    if (teamId === null) {
      return res.status(400).json({ error: 'Invalid team channel' })
    }
    if (user.role === 'admin') {
      return next()
    }
    if (user.role === 'team' && user.team_id === teamId) {
      return next()
    }
    return res.status(403).json({ error: 'Access denied to this team channel' })
  }

  if (channel === 'judge') {
    if (user.role === 'admin' || user.role === 'judge') {
      return next()
    }
    return res.status(403).json({ error: 'Access denied to judge channel' })
  }

  return res.status(400).json({ error: 'Unknown channel type' })
}

function determineChannel(req: Request): string | null {
  const path = req.path
  if (path.includes('/judge/')) return 'judge'
  const teamMatch = path.match(/\/team\/([^/]+)/)
  if (teamMatch) return `team:${teamMatch[1]}`
  return null
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}
