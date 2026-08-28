import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { sendEmail, markdownToHtml } from '../email.js'
import { authMiddleware } from '../middleware/auth.js'
import { resolveTeamSlug } from '../team-utils.js'

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

router.get('/:teamSlug', authMiddleware, (req: Request, res: Response) => {
  const teamId = resolveTeamSlug(req.params.teamSlug as string)
  if (teamId === null) {
    return res.status(404).json({ error: 'Team not found' })
  }
  if (req.user?.role !== 'admin' && req.user?.team_id !== teamId) {
    return res.status(403).json({ error: 'Access denied' })
  }

  const db = getDb()
  const rows = db.exec(
    'SELECT id, team_id, name, email, message, status, created_at FROM join_requests WHERE team_id = ? ORDER BY created_at DESC',
    [teamId]
  )
  res.json(rowsToArray(rows))
})

router.post('/', (req: Request, res: Response) => {
  const { team_id, name, email, message } = req.body

  if (!team_id || !name || !email) {
    return res.status(400).json({ error: 'Equipo, nombre y email son requeridos' })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' })
  }

  const db = getDb()

  const teamRows = db.exec('SELECT id, name, captain_email, members FROM teams WHERE id = ?', [team_id])
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Equipo no encontrado' })
  }

  const team = {
    id: teamRows[0].values[0][0] as number,
    name: teamRows[0].values[0][1] as string,
    captain_email: teamRows[0].values[0][2] as string,
    members: teamRows[0].values[0][3] as string,
  }

  db.run(
    'INSERT INTO join_requests (team_id, name, email, message) VALUES (?, ?, ?, ?)',
    [team_id, name.trim(), email.trim().toLowerCase(), message?.trim() || null]
  )
  saveDb()

  // Send email notification to captain
  const htmlBody = markdownToHtml(
    `**${name.trim()}** quiere unirse a tu equipo **${team.name}**.\n\n` +
    `Email: ${email.trim()}` +
    (message?.trim() ? `\n\nMensaje:\n> ${message.trim()}` : '') +
    `\n\nPara aprobar o rechazar, ingresa al panel de administración.`
  )

  sendEmail(team.captain_email, `Alguien quiere unirse a ${team.name}`, htmlBody)

  res.status(201).json({ success: true })
})

router.patch('/:id/accept', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const requestId = Number(req.params.id)

  const reqRows = db.exec(
    'SELECT id, team_id, name, email, status FROM join_requests WHERE id = ?',
    [requestId]
  )
  if (reqRows.length === 0 || reqRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const request = {
    id: reqRows[0].values[0][0] as number,
    team_id: reqRows[0].values[0][1] as number,
    name: reqRows[0].values[0][2] as string,
    email: reqRows[0].values[0][3] as string,
    status: reqRows[0].values[0][4] as string,
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already processed' })
  }

  const teamRows = db.exec(
    'SELECT id, name, captain_email, members FROM teams WHERE id = ?',
    [request.team_id]
  )
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const team = {
    id: teamRows[0].values[0][0] as number,
    name: teamRows[0].values[0][1] as string,
    captain_email: teamRows[0].values[0][2] as string,
    members: teamRows[0].values[0][3] as string,
  }

  if (req.user?.role !== 'admin' && req.user?.email !== team.captain_email) {
    return res.status(403).json({ error: 'Only the captain can manage requests' })
  }

  let members: { name: string; email: string }[]
  try {
    members = JSON.parse(team.members || '[]')
  } catch {
    members = []
  }
  if (members.length >= 3) {
    return res.status(400).json({ error: 'Team is full' })
  }

  members.push({ name: request.name, email: request.email })

  let rejectedCount = 0
  db.run('BEGIN')
  try {
    db.run('UPDATE teams SET members = ? WHERE id = ?', [JSON.stringify(members), team.id])
    db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['accepted', request.id])

    const otherPending = db.exec(
      'SELECT id, name, email FROM join_requests WHERE team_id = ? AND status = ? AND id != ?',
      [team.id, 'pending', request.id]
    )
    if (otherPending.length > 0 && otherPending[0].values.length > 0) {
      for (const row of otherPending[0].values) {
        const rId = row[0] as number
        const rName = row[1] as string
        const rEmail = row[2] as string

        db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['rejected', rId])

        const fullHtml = markdownToHtml(
          `Hola ${rName},\n\n` +
          `El equipo **${team.name}** ya alcanzó el número máximo de integrantes (3).\n\n` +
          `Te invitamos a unirte a otro equipo o crear el tuyo:\n` +
          `- [Unirse a otro equipo](/join)\n` +
          `- [Registrar equipo](/register)`
        )
        sendEmail(rEmail, `El equipo ${team.name} está completo`, fullHtml)
        rejectedCount++
      }
    }

    db.run('COMMIT')
  } catch (err) {
    db.run('ROLLBACK')
    throw err
  }

  saveDb()

  const acceptHtml = markdownToHtml(
    `¡Hola ${request.name}!\n\n` +
    `Tu solicitud para unirse al equipo **${team.name}** ha sido aceptada.\n\n` +
    `Ya puedes acceder al chat del equipo con tus credenciales.\n\n` +
    `¡Nos vemos en el torneo!`
  )
  sendEmail(request.email, `¡Bienvenido a ${team.name}!`, acceptHtml)

  const captainHtml = markdownToHtml(
    `**${request.name}** (${request.email}) ha sido aceptado(a) en tu equipo.\n\n` +
    `Ya tiene acceso al chat del equipo.`
  )
  sendEmail(team.captain_email, `${request.name} se unió a ${team.name}`, captainHtml)

  res.json({ success: true, accepted: { name: request.name, email: request.email }, rejected_count: rejectedCount })
})

router.patch('/:id/reject', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const requestId = Number(req.params.id)

  const reqRows = db.exec(
    'SELECT id, team_id, name, email, status FROM join_requests WHERE id = ?',
    [requestId]
  )
  if (reqRows.length === 0 || reqRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const request = {
    id: reqRows[0].values[0][0] as number,
    team_id: reqRows[0].values[0][1] as number,
    name: reqRows[0].values[0][2] as string,
    email: reqRows[0].values[0][3] as string,
    status: reqRows[0].values[0][4] as string,
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already processed' })
  }

  const teamRows = db.exec(
    'SELECT id, name, captain_email FROM teams WHERE id = ?',
    [request.team_id]
  )
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const team = {
    id: teamRows[0].values[0][0] as number,
    name: teamRows[0].values[0][1] as string,
    captain_email: teamRows[0].values[0][2] as string,
  }

  if (req.user?.role !== 'admin' && req.user?.email !== team.captain_email) {
    return res.status(403).json({ error: 'Only the captain can manage requests' })
  }

  db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['rejected', request.id])
  saveDb()

  const rejectHtml = markdownToHtml(
    `Hola ${request.name},\n\n` +
    `Lamentablemente tu solicitud para unirse al equipo **${team.name}** no fue aceptada.\n\n` +
    `Puedes intentar unirte a otro equipo o crear el tuyo:\n` +
    `- [Unirse a otro equipo](/join)\n` +
    `- [Registrar equipo](/register)`
  )
  sendEmail(request.email, `Actualización de tu solicitud a ${team.name}`, rejectHtml)

  res.json({ success: true })
})

export default router
