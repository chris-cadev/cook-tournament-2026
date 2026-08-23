import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb, saveDb } from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'migrations')

export function runMigrations() {
  const db = getDb()

  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

  if (!fs.existsSync(migrationsDir)) return

  const appliedRows = db.exec('SELECT filename FROM _migrations')
  const appliedSet = new Set(
    appliedRows.length > 0 ? appliedRows[0].values.map(r => r[0] as string) : []
  )

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (appliedSet.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    db.run(sql)
    db.run('INSERT INTO _migrations (filename) VALUES (?)', [file])
    console.log(`Migration applied: ${file}`)
  }

  saveDb()
}
