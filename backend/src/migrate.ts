import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb, saveDb } from './db.js'
import { slugify } from './team-utils.js'

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
    try {
      db.run(sql)
      db.run('INSERT INTO _migrations (filename) VALUES (?)', [file])
      console.log(`Migration applied: ${file}`)
    } catch (err: any) {
      console.error(`Migration ${file} failed:`, err.message)
      // Continue to next migration instead of crashing
    }
  }

  // Backfill slugs for teams that don't have one yet
  const slugRows = db.exec('SELECT id, name FROM teams WHERE slug IS NULL')
  if (slugRows.length > 0 && slugRows[0].values.length > 0) {
    for (const row of slugRows[0].values) {
      const id = row[0] as number
      const name = row[1] as string
      const slug = slugify(name)
      db.run('UPDATE teams SET slug = ? WHERE id = ?', [slug, id])
    }
    // Create unique index if it doesn't exist
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug) WHERE slug IS NOT NULL')
  }

  saveDb()
}
