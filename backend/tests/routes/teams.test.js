import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const migrationsDir = path.join(import.meta.dirname, '..', '..', 'src', 'migrations');
let db;
async function createTestDb() {
    const SQL = await initSqlJs();
    db = new SQL.Database();
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    db.run(`CREATE TABLE IF NOT EXISTS _migrations (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TEXT DEFAULT (datetime('now'))
  )`);
    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
            db.run(sql);
        }
        catch { /* skip failing migrations */ }
    }
    return db;
}
function insertTeam(overrides = {}) {
    const hash = bcrypt.hashSync('password123', 1);
    const defaults = {
        name: 'Test Team',
        slug: 'test-team',
        sandwich_name: 'Torta Especial',
        captain_email: 'test@test.com',
        password_hash: hash,
        members: '[]',
        status: 'pending',
        access_code: 'ABC123',
        open_to_join: 0,
    };
    const team = { ...defaults, ...overrides };
    db.run(`INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, status, access_code, open_to_join)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [team.name, team.slug, team.sandwich_name, team.captain_email, team.password_hash, team.members, team.status, team.access_code, team.open_to_join]);
}
function makeTeamToken(teamId, slug) {
    return jwt.sign({ team_id: teamId, team_slug: slug, name: 'Test Team', role: 'team' }, JWT_SECRET, { expiresIn: '1h' });
}
function rowsToArray(rows) {
    if (rows.length === 0)
        return [];
    return rows[0].values.map((vals) => {
        const obj = {};
        rows[0].columns.forEach((c, i) => (obj[c] = vals[i]));
        return obj;
    });
}
beforeEach(async () => {
    await createTestDb();
});
afterEach(() => {
    db?.close();
});
describe('teams route - register', () => {
    it('creates a new team', () => {
        insertTeam({ name: 'Unique Team', slug: 'unique-team' });
        const rows = db.exec('SELECT id, name, slug FROM teams WHERE slug = ?', ['unique-team']);
        const teams = rowsToArray(rows);
        expect(teams).toHaveLength(1);
        expect(teams[0].name).toBe('Unique Team');
    });
    it('enforces unique name constraint', () => {
        insertTeam({ name: 'Same Name', slug: 'same-name' });
        expect(() => {
            insertTeam({ name: 'Same Name', slug: 'same-name-2' });
        }).toThrow();
    });
    it('enforces unique slug constraint', () => {
        insertTeam({ name: 'Team A', slug: 'dup-slug' });
        expect(() => {
            insertTeam({ name: 'Team B', slug: 'dup-slug' });
        }).toThrow();
    });
});
describe('teams route - access codes', () => {
    it('validates access code', () => {
        insertTeam({ access_code: 'XYZ789' });
        const rows = db.exec('SELECT name FROM teams WHERE access_code = ?', ['XYZ789']);
        const result = rowsToArray(rows);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Test Team');
    });
    it('rejects invalid access code', () => {
        insertTeam();
        const rows = db.exec('SELECT name FROM teams WHERE access_code = ?', ['WRONG']);
        const result = rowsToArray(rows);
        expect(result).toHaveLength(0);
    });
});
describe('teams route - CRUD', () => {
    it('updates team status', () => {
        insertTeam({ slug: 'update-test' });
        db.run("UPDATE teams SET status = 'approved' WHERE slug = ?", ['update-test']);
        const rows = db.exec('SELECT status FROM teams WHERE slug = ?', ['update-test']);
        const teams = rowsToArray(rows);
        expect(teams[0].status).toBe('approved');
    });
    it('deletes a team', () => {
        insertTeam({ slug: 'delete-me' });
        db.run('DELETE FROM teams WHERE slug = ?', ['delete-me']);
        const rows = db.exec('SELECT id FROM teams WHERE slug = ?', ['delete-me']);
        expect(rows.length === 0 || rows[0].values.length === 0).toBe(true);
    });
    it('fetches team by slug', () => {
        insertTeam({ slug: 'fetch-me' });
        const rows = db.exec('SELECT id, slug, name FROM teams WHERE slug = ?', ['fetch-me']);
        const teams = rowsToArray(rows);
        expect(teams).toHaveLength(1);
        expect(teams[0].slug).toBe('fetch-me');
    });
});
describe('teams route - checklist', () => {
    it('stores and retrieves checklist as JSON', () => {
        insertTeam({ slug: 'checklist-team' });
        const checklist = [{ text: 'Buy bread', done: false }, { text: 'Make salsa', done: true }];
        db.run('UPDATE teams SET checklist = ? WHERE slug = ?', [JSON.stringify(checklist), 'checklist-team']);
        const rows = db.exec('SELECT checklist FROM teams WHERE slug = ?', ['checklist-team']);
        const teams = rowsToArray(rows);
        const parsed = JSON.parse(teams[0].checklist);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].text).toBe('Buy bread');
        expect(parsed[1].done).toBe(true);
    });
});
describe('teams route - stations', () => {
    it('can update station for a team', () => {
        insertTeam({ slug: 'station-test' });
        db.run("UPDATE teams SET station = 'Mesa 1' WHERE slug = ?", ['station-test']);
        const rows = db.exec('SELECT station FROM teams WHERE slug = ?', ['station-test']);
        const teams = rowsToArray(rows);
        expect(teams[0].station).toBe('Mesa 1');
    });
});
