import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
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
function rowsToArray(rows) {
    if (rows.length === 0)
        return [];
    return rows[0].values.map((vals) => {
        const obj = {};
        rows[0].columns.forEach((c, i) => (obj[c] = vals[i]));
        return obj;
    });
}
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return null;
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
function insertTeam(overrides = {}) {
    const defaults = {
        name: 'Test Team',
        slug: 'test-team',
        sandwich_name: 'Torta',
        captain_email: 'test@test.com',
        password_hash: 'hash',
        members: '[]',
        status: 'pending',
        access_code: 'ABC',
        open_to_join: 0,
    };
    const team = { ...defaults, ...overrides };
    db.run(`INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, status, access_code, open_to_join)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [team.name, team.slug, team.sandwich_name, team.captain_email, team.password_hash, team.members, team.status, team.access_code, team.open_to_join]);
}
function insertChatMessage(overrides = {}) {
    const defaults = {
        channel: 'global',
        sender_name: 'Test User',
        sender_role: 'guest',
        content: 'Hello!',
    };
    const msg = { ...defaults, ...overrides };
    db.run('INSERT INTO chat_messages (channel, sender_name, sender_role, content) VALUES (?, ?, ?, ?)', [msg.channel, msg.sender_name, msg.sender_role, msg.content]);
}
function insertScore(teamId, judgeId, category, value) {
    db.run('INSERT INTO scores (team_id, judge_anonymous_id, category, value) VALUES (?, ?, ?, ?)', [teamId, judgeId, category, value]);
}
beforeEach(async () => {
    await createTestDb();
});
afterEach(() => {
    db?.close();
});
describe('chat messages - database operations', () => {
    it('inserts and retrieves global chat messages', () => {
        insertChatMessage({ channel: 'global', content: 'Hola!' });
        insertChatMessage({ channel: 'global', content: 'Que tal?' });
        const rows = db.exec("SELECT * FROM chat_messages WHERE channel = 'global' ORDER BY created_at DESC");
        const messages = rowsToArray(rows);
        expect(messages).toHaveLength(2);
        expect(messages[0].content).toBe('Que tal?');
        expect(messages[1].content).toBe('Hola!');
    });
    it('inserts team-scoped messages', () => {
        insertTeam({ slug: 'team-alpha' });
        insertChatMessage({ channel: 'team:team-alpha', content: 'Team msg' });
        const rows = db.exec("SELECT * FROM chat_messages WHERE channel = 'team:team-alpha'");
        const messages = rowsToArray(rows);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Team msg');
    });
    it('inserts judge-scoped messages', () => {
        insertChatMessage({ channel: 'judge', content: 'Judge msg', sender_role: 'judge' });
        const rows = db.exec("SELECT * FROM chat_messages WHERE channel = 'judge'");
        const messages = rowsToArray(rows);
        expect(messages).toHaveLength(1);
    });
    it('rejects null content', () => {
        expect(() => {
            db.run("INSERT INTO chat_messages (channel, sender_name, sender_role, content) VALUES ('global', 'User', 'guest', NULL)");
        }).toThrow();
    });
    it('deletes a message by id', () => {
        insertChatMessage({ content: 'Delete me' });
        const rows = db.exec("SELECT id FROM chat_messages WHERE content = 'Delete me'");
        const id = rows[0].values[0][0];
        db.run('DELETE FROM chat_messages WHERE id = ?', [id]);
        const after = db.exec("SELECT id FROM chat_messages WHERE content = 'Delete me'");
        expect(after.length === 0 || after[0].values.length === 0).toBe(true);
    });
    it('supports pagination with before parameter', () => {
        for (let i = 0; i < 5; i++) {
            insertChatMessage({ content: `Message ${i}` });
        }
        const rows = db.exec("SELECT * FROM chat_messages WHERE channel = 'global' ORDER BY created_at DESC LIMIT 3");
        const messages = rowsToArray(rows);
        expect(messages).toHaveLength(3);
        const lastId = messages[0].id;
        const beforeRows = db.exec("SELECT * FROM chat_messages WHERE channel = 'global' AND id < ? ORDER BY created_at DESC LIMIT 10", [lastId]);
        const older = rowsToArray(beforeRows);
        expect(older.length).toBeGreaterThan(0);
        expect(older.every((m) => m.id < lastId)).toBe(true);
    });
});
describe('scores - database operations', () => {
    it('inserts scores and enforces value range', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        insertScore(1, 'j1', 'Taste', 8);
        const rows = db.exec('SELECT value FROM scores WHERE team_id = 1');
        const scores = rowsToArray(rows);
        expect(scores[0].value).toBe(8);
    });
    it('rejects score below 1', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        expect(() => insertScore(1, 'j1', 'Taste', 0)).toThrow();
    });
    it('rejects score above 10', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        expect(() => insertScore(1, 'j1', 'Taste', 11)).toThrow();
    });
    it('enforces unique constraint per team/judge/category', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        insertScore(1, 'j1', 'Taste', 8);
        expect(() => insertScore(1, 'j1', 'Taste', 9)).toThrow();
    });
    it('allows same team with different judges', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        insertScore(1, 'j1', 'Taste', 8);
        insertScore(1, 'j2', 'Taste', 9);
        const rows = db.exec('SELECT COUNT(*) as count FROM scores WHERE team_id = 1');
        const result = rowsToArray(rows);
        expect(result[0].count).toBe(2);
    });
    it('allows same team with different categories', () => {
        insertTeam({ name: 'Score Team', slug: 'score-team' });
        insertScore(1, 'j1', 'Taste', 8);
        insertScore(1, 'j1', 'Presentation', 9);
        const rows = db.exec('SELECT COUNT(*) as count FROM scores WHERE team_id = 1');
        const result = rowsToArray(rows);
        expect(result[0].count).toBe(2);
    });
    it('calculates average score per team', () => {
        insertTeam({ name: 'Avg Team', slug: 'avg-team' });
        insertScore(1, 'j1', 'Taste', 6);
        insertScore(1, 'j2', 'Taste', 8);
        const rows = db.exec("SELECT AVG(value) as avg FROM scores WHERE team_id = 1 AND category = 'Taste'");
        const result = rowsToObject(rows);
        expect(result.avg).toBe(7);
    });
});
describe('event_config - database operations', () => {
    it('has default scoring categories', () => {
        const rows = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1');
        const config = rowsToObject(rows);
        expect(config).not.toBeNull();
        const cats = JSON.parse(config.scoring_categories || '[]');
        expect(Array.isArray(cats)).toBe(true);
    });
    it('can update scoring categories', () => {
        const categories = ['Taste', 'Presentation', 'Creativity'];
        db.run('UPDATE event_config SET scoring_categories = ? WHERE id = 1', [JSON.stringify(categories)]);
        const rows = db.exec('SELECT scoring_categories FROM event_config WHERE id = 1');
        const config = rowsToObject(rows);
        const cats = JSON.parse(config.scoring_categories);
        expect(cats).toEqual(['Taste', 'Presentation', 'Creativity']);
    });
    it('can update revealed categories', () => {
        db.run("UPDATE event_config SET revealed_categories = '[\"Taste\"]' WHERE id = 1");
        const rows = db.exec('SELECT revealed_categories FROM event_config WHERE id = 1');
        const config = rowsToObject(rows);
        const revealed = JSON.parse(config.revealed_categories);
        expect(revealed).toEqual(['Taste']);
    });
});
