import bcrypt from 'bcrypt'
import { getDb, saveDb } from './db.js'

export function seedAdmin() {
  const db = getDb()
  const email = process.env.ADMIN_EMAIL || 'admin@cook-tournament.com'
  const password = process.env.ADMIN_PASSWORD || 'changeme'

  const existing = db.exec('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length > 0 && existing[0].values.length > 0) return

  const hash = bcrypt.hashSync(password, 10)
  db.run(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
    [email, hash, 'Admin', 'admin']
  )
  saveDb()
  console.log(`Admin user seeded: ${email}`)
}

export function seedEventConfig() {
  const db = getDb()

  const configRows = db.exec('SELECT event_date FROM event_config WHERE id = 1')
  const hasDate = configRows.length > 0 && configRows[0].values[0][0]
  if (!hasDate) {
    db.run("UPDATE event_config SET event_date = '2026-10-10T14:00:00' WHERE id = 1")
    console.log('Event date seeded: 2026-10-10T14:00:00')
  }

  const catRows = db.exec('SELECT COUNT(*) as cnt FROM scoring_categories')
  const count = catRows.length > 0 ? (catRows[0].values[0][0] as number) : 0
  if (count === 0) {
    const categories = [
      { name: 'Sabor', weight: 2, max_points: 20, description: 'Balance de sabores, sazón, nivel de delicia general', sort_order: 1 },
      { name: 'Textura', weight: 1, max_points: 10, description: 'Frescura del pan, crujiente, consistencia del relleno', sort_order: 2 },
      { name: 'Creatividad', weight: 1, max_points: 10, description: 'Combinaciones originales, técnicas ingeniosas', sort_order: 3 },
      { name: 'Presentación', weight: 1, max_points: 10, description: 'Emplatado, color, limpieza, atractivo visual', sort_order: 4 },
      { name: 'Bonificación', weight: 1, max_points: 2, description: 'Pan casero, pepinillos caseros, ingrediente salvaje', sort_order: 5 },
    ]
    for (const c of categories) {
      db.run(
        'INSERT INTO scoring_categories (name, weight, max_points, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [c.name, c.weight, c.max_points, c.description, c.sort_order]
      )
    }
    console.log('Scoring categories seeded: 5 categories')
  }

  const syncedRows = db.exec('SELECT name FROM scoring_categories ORDER BY sort_order')
  if (syncedRows.length > 0) {
    const names = syncedRows[0].values.map(r => r[0] as string)
    db.run('UPDATE event_config SET scoring_categories = ? WHERE id = 1', [JSON.stringify(names)])
  }

  saveDb()
}
