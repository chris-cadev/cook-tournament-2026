import dotenv from 'dotenv'
import path from 'path'

// Find .env by walking up from CWD
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { initSocket } from './socket.js'
import { initDb } from './db.js'
import { runMigrations } from './migrate.js'
import { seedAdmin, seedEventConfig } from './seed.js'

import authRoutes from './routes/auth.js'
import configRoutes from './routes/config.js'
import teamsRoutes from './routes/teams.js'
import judgesRoutes from './routes/judges.js'
import scoresRoutes from './routes/scores.js'
import chatRoutes from './routes/chat.js'
import uploadRoutes from './routes/upload.js'
import adminRoutes from './routes/admin.js'
import emailRoutes from './routes/email.js'
import stationsRoutes from './routes/stations.js'
import invitesRoutes from './routes/invites.js'
import todosRoutes from './routes/todos.js'
import todoRoutes from './routes/todo.js'
import guestsRoutes from './routes/guests.js'
import joinRequestsRoutes from './routes/join-requests.js'
import notesRoutes from './routes/notes.js'

const app = express()
const server = createServer(app)

const frontendPort = process.env.PORT || 3000
app.use(cors({ origin: [`http://localhost:${frontendPort}`, 'http://localhost:5173'], credentials: true }))
app.use(express.json())

initSocket(server)

app.use('/api/auth', authRoutes)
app.use('/api/config', configRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/judges', judgesRoutes)
app.use('/api/scores', scoresRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/email', emailRoutes)
app.use('/api/admin/stations', stationsRoutes)
app.use('/api/invites', invitesRoutes)
app.use('/api/todo', todoRoutes)
app.use('/api/guests', guestsRoutes)
app.use('/api/join-requests', joinRequestsRoutes)
app.use('/api/teams', notesRoutes)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

async function start() {
  await initDb()
  runMigrations()
  seedAdmin()
  seedEventConfig()

  const PORT = process.env.BACKEND_PORT || 3001
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
