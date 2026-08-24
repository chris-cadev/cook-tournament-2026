import { describe, it, expect } from 'vitest'
import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

const migrationsDir = path.join(import.meta.dirname, 'migrations')

async function createTestDb() {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA foreign_keys = ON')
  return db
}

function runMigrations(db: Awaited<ReturnType<typeof createTestDb>>) {
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

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
  }
}

function query(db: Awaited<ReturnType<typeof createTestDb>>, sql: string, params: any[] = []) {
  const stmt = db.prepare(sql)
  if (params.length > 0) stmt.bind(params)
  const rows: any[] = []
  while (stmt.step()) rows.push(stmt.getAsObject())
  stmt.free()
  return rows
}

describe('database migrations', () => {
  it('creates all required tables', async () => {
    const db = await createTestDb()
    runMigrations(db)

    const tables = query(db, "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    const tableNames = tables.map((t: any) => t.name)

    expect(tableNames).toContain('users')
    expect(tableNames).toContain('teams')
    expect(tableNames).toContain('judges')
    expect(tableNames).toContain('scores')
    expect(tableNames).toContain('chat_messages')
    expect(tableNames).toContain('event_config')
    expect(tableNames).toContain('invite_codes')
    expect(tableNames).toContain('_migrations')
  })

  it('creates event_config singleton row', async () => {
    const db = await createTestDb()
    runMigrations(db)

    const rows = query(db, 'SELECT id, event_title FROM event_config WHERE id = 1')
    expect(rows).toHaveLength(1)
    expect(rows[0].event_title).toBe('The Crust Competition 2026')
  })

  it('enforces score value constraint (1-10)', async () => {
    const db = await createTestDb()
    runMigrations(db)

    db.run("INSERT INTO teams (name, sandwich_name, captain_email, password_hash) VALUES ('t1', 's1', 'a@b.com', 'hash')")

    expect(() => {
      db.run("INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (1, 'j1', 'Taste', 0)")
    }).toThrow()

    expect(() => {
      db.run("INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (1, 'j1', 'Taste', 11)")
    }).toThrow()

    db.run("INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (1, 'j1', 'Taste', 5)")
    const rows = query(db, 'SELECT value FROM scores WHERE team_id = 1')
    expect(rows[0].value).toBe(5)
  })

  it('enforces unique constraint on scores', async () => {
    const db = await createTestDb()
    runMigrations(db)

    db.run("INSERT INTO teams (name, sandwich_name, captain_email, password_hash) VALUES ('t1', 's1', 'a@b.com', 'hash')")
    db.run("INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (1, 'j1', 'Taste', 8)")

    expect(() => {
      db.run("INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (1, 'j1', 'Taste', 9)")
    }).toThrow()
  })

  it('applies migrations idempotently', async () => {
    const db = await createTestDb()
    runMigrations(db)

    const migrationRows = query(db, 'SELECT COUNT(*) as count FROM _migrations')
    const count = migrationRows[0].count

    runMigrations(db)

    const migrationRows2 = query(db, 'SELECT COUNT(*) as count FROM _migrations')
    expect(migrationRows2[0].count).toBe(count)
  })
})
