import { getDb } from './db.js'

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function resolveTeamSlug(slug: string): number | null {
  const db = getDb()
  const rows = db.exec('SELECT id FROM teams WHERE slug = ?', [slug])
  if (rows.length === 0 || rows[0].values.length === 0) return null
  return rows[0].values[0][0] as number
}
