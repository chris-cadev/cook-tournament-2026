import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

import { initDb } from './db.js'
import { runMigrations } from './migrate.js'
import { seedAdmin } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function reset() {
  const dbPath = path.join(__dirname, '..', 'data', 'tournament.db')
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)

  await initDb()
  runMigrations()
  seedAdmin()
  // eslint-disable-next-line no-console
  console.log('Database reset complete.')
}

reset().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Reset failed:', err)
  process.exit(1)
})
