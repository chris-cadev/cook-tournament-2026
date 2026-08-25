import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'http';
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express from 'express';
import cors from 'cors';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const migrationsDir = path.join(import.meta.dirname, '..', '..', 'src', 'migrations');
let db;
let server;
let baseUrl;
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
        catch { /* skip */ }
    }
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
function insertTeam(overrides = {}) {
    const hash = bcrypt.hashSync('password123', 1);
    const defaults = {
        name: 'E2E Team',
        slug: 'e2e-team',
        sandwich_name: 'Torta E2E',
        captain_email: 'e2e@test.com',
        password_hash: hash,
        members: '[]',
        status: 'approved',
        access_code: 'E2E001',
        open_to_join: 0,
    };
    const team = { ...defaults, ...overrides };
    db.run(`INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, status, access_code, open_to_join)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [team.name, team.slug, team.sandwich_name, team.captain_email, team.password_hash, team.members, team.status, team.access_code, team.open_to_join]);
}
function insertUser(overrides = {}) {
    const hash = bcrypt.hashSync('admin123', 1);
    const defaults = {
        email: 'admin@e2e.com',
        password_hash: hash,
        name: 'Admin E2E',
        role: 'admin',
    };
    const user = { ...defaults, ...overrides };
    db.run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [user.email, user.password_hash, user.name, user.role]);
}
function makeToken(role, payload = {}) {
    return jwt.sign({ role, ...payload }, JWT_SECRET, { expiresIn: '1h' });
}
function request(method, urlPath, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlPath, baseUrl);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                }
                catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, body: parsed, headers: res.headers });
            });
        });
        req.on('error', reject);
        if (body)
            req.write(JSON.stringify(body));
        req.end();
    });
}
function createApp() {
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.post('/api/auth/admin/login', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password required' });
        const rows = db.exec('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0 || rows[0].values.length === 0)
            return res.status(401).json({ error: 'Invalid credentials' });
        const user = {};
        rows[0].columns.forEach((c, i) => (user[c] = rows[0].values[0][i]));
        if (!bcrypt.compareSync(password, user.password_hash))
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('session_token', token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 86400000 });
        res.json({ user: { id: user.id, email: user.email, name: user.name, role: 'admin' } });
    });
    app.post('/api/auth/team/login', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password required' });
        const rows = db.exec('SELECT * FROM teams WHERE captain_email = ?', [email]);
        if (rows.length === 0 || rows[0].values.length === 0)
            return res.status(401).json({ error: 'Invalid credentials' });
        const team = {};
        rows[0].columns.forEach((c, i) => (team[c] = rows[0].values[0][i]));
        if (!bcrypt.compareSync(password, team.password_hash))
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ team_id: team.id, team_slug: team.slug, name: team.name, role: 'team' }, JWT_SECRET, { expiresIn: '24h' });
        res.cookie('session_token', token, { httpOnly: true, sameSite: 'strict', path: '/', maxAge: 86400000 });
        res.json({ team: { id: team.id, slug: team.slug, name: team.name, sandwich_name: team.sandwich_name, role: 'team' } });
    });
    app.post('/api/teams/register', (req, res) => {
        const { name, sandwich_name, captain_email, password } = req.body;
        if (!name || !captain_email || !password)
            return res.status(400).json({ error: 'Missing required fields' });
        const existing = db.exec('SELECT id FROM teams WHERE name = ?', [name]);
        if (existing.length > 0 && existing[0].values.length > 0)
            return res.status(409).json({ error: 'Team name already taken' });
        const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const hash = bcrypt.hashSync(password, 10);
        const accessCode = require('crypto').randomBytes(4).toString('hex').toUpperCase();
        db.run(`INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, access_code, open_to_join) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [name, slug, sandwich_name || '', captain_email, hash, '[]', accessCode, 0]);
        const idRows = db.exec('SELECT last_insert_rowid() as id');
        const id = idRows[0].values[0][0];
        res.status(201).json({ id, slug, name, sandwich_name, status: 'pending', access_code: accessCode });
    });
    app.get('/api/teams/validate-access-code', (req, res) => {
        const { access_code } = req.query;
        if (!access_code || typeof access_code !== 'string')
            return res.json({ valid: false });
        const rows = db.exec('SELECT name FROM teams WHERE access_code = ?', [access_code.trim().toUpperCase()]);
        if (rows.length === 0 || rows[0].values.length === 0)
            return res.json({ valid: false });
        res.json({ valid: true, name: rows[0].values[0][0] });
    });
    app.get('/api/chat/global/messages', (req, res) => {
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const rows = db.exec("SELECT * FROM chat_messages WHERE channel = 'global' ORDER BY created_at DESC LIMIT ?", [limit]);
        const messages = rowsToArray(rows).reverse();
        res.json({ messages });
    });
    app.post('/api/chat/global/messages', (req, res) => {
        const { sender_name, content } = req.body;
        if (!content || typeof content !== 'string' || content.trim().length === 0)
            return res.status(400).json({ error: 'Message content is required' });
        if (content.length > 2000)
            return res.status(400).json({ error: 'Message too long' });
        let user;
        try {
            const header = req.headers.authorization;
            const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(c => { const [k, ...v] = c.trim().split('='); return [k, v.join('=')]; }));
            const token = header?.startsWith('Bearer ') ? header.slice(7) : cookies['session_token'] || null;
            if (token)
                user = jwt.verify(token, JWT_SECRET);
        }
        catch { }
        const name = sender_name?.trim() || user?.name || 'Anonymous';
        const role = user?.role || 'guest';
        db.run('INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)', ['global', user?.id || null, name, role, content.trim()]);
        const idRows = db.exec('SELECT last_insert_rowid() as id');
        const id = idRows[0].values[0][0];
        const msgRows = db.exec('SELECT * FROM chat_messages WHERE id = ?', [id]);
        const message = rowsToArray(msgRows)[0];
        res.status(201).json({ message });
    });
    app.get('/api/chat/team/:teamSlug/messages', (req, res) => {
        let user;
        try {
            const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
            if (token)
                user = jwt.verify(token, JWT_SECRET);
        }
        catch { }
        if (!user)
            return res.status(401).json({ error: 'Auth required' });
        const channel = `team:${req.params.teamSlug}`;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const rows = db.exec('SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?', [channel, limit]);
        res.json({ messages: rowsToArray(rows).reverse() });
    });
    app.post('/api/chat/team/:teamSlug/messages', (req, res) => {
        const { content } = req.body;
        if (!content || content.trim().length === 0)
            return res.status(400).json({ error: 'Content required' });
        const channel = `team:${req.params.teamSlug}`;
        let user;
        try {
            const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
            if (token)
                user = jwt.verify(token, JWT_SECRET);
        }
        catch { }
        if (!user)
            return res.status(401).json({ error: 'Auth required' });
        db.run('INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)', [channel, user.team_id || user.id, user.name || 'User', user.role, content.trim()]);
        const idRows = db.exec('SELECT last_insert_rowid() as id');
        const id = idRows[0].values[0][0];
        const msgRows = db.exec('SELECT * FROM chat_messages WHERE id = ?', [id]);
        res.status(201).json({ message: rowsToArray(msgRows)[0] });
    });
    app.post('/api/guests/rsvp', (req, res) => {
        const { name, email, num_people } = req.body;
        if (!name || !email)
            return res.status(400).json({ error: 'Nombre y email son requeridos' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            return res.status(400).json({ error: 'Email inválido' });
        const existing = db.exec('SELECT id FROM guests WHERE email = ?', [email]);
        if (existing.length > 0 && existing[0].values.length > 0)
            return res.status(409).json({ error: 'Este email ya está registrado' });
        const accessCode = require('crypto').randomBytes(4).toString('hex').toUpperCase();
        db.run('INSERT INTO guests (name, email, num_people, access_code) VALUES (?, ?, ?, ?)', [name.trim(), email.trim().toLowerCase(), num_people || 0, accessCode]);
        res.status(201).json({ success: true, access_code: accessCode });
    });
    app.get('/api/guests/validate-access-code', (req, res) => {
        const { access_code } = req.query;
        if (!access_code)
            return res.json({ valid: false });
        const rows = db.exec('SELECT name FROM guests WHERE access_code = ?', [access_code.trim().toUpperCase()]);
        if (rows.length === 0 || rows[0].values.length === 0)
            return res.json({ valid: false });
        res.json({ valid: true, name: rows[0].values[0][0] });
    });
    app.get('/api/health', (_req, res) => res.json({ ok: true }));
    return app;
}
beforeAll(async () => {
    await createTestDb();
    const app = createApp();
    server = app.listen(0);
    const addr = server.address();
    baseUrl = `http://localhost:${addr.port}`;
});
afterAll(() => {
    server?.close();
    db?.close();
});
beforeEach(() => {
    try {
        db.run('DELETE FROM chat_messages');
    }
    catch { }
    try {
        db.run('DELETE FROM scores');
    }
    catch { }
    try {
        db.run("DELETE FROM teams WHERE name = 'E2E Team'");
    }
    catch { }
    try {
        db.run("DELETE FROM users WHERE email = 'admin@e2e.com'");
    }
    catch { }
    try {
        db.run("DELETE FROM guests WHERE email LIKE '%@e2e.com'");
    }
    catch { }
});
describe('E2E: health check', () => {
    it('returns ok', async () => {
        const res = await request('GET', '/api/health');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});
describe('E2E: team registration', () => {
    it('registers a new team', async () => {
        const res = await request('POST', '/api/teams/register', {
            name: 'E2E Team',
            sandwich_name: 'Torta E2E',
            captain_email: 'e2e@test.com',
            password: 'password123',
        });
        expect(res.status).toBe(201);
        expect(res.body.slug).toBe('e2e-team');
        expect(res.body.access_code).toBeDefined();
    });
    it('rejects duplicate team name', async () => {
        insertTeam();
        const res = await request('POST', '/api/teams/register', {
            name: 'E2E Team',
            sandwich_name: 'Another',
            captain_email: 'other@test.com',
            password: 'password123',
        });
        expect(res.status).toBe(409);
    });
    it('validates access code', async () => {
        insertTeam();
        const res = await request('GET', '/api/teams/validate-access-code?access_code=E2E001');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.name).toBe('E2E Team');
    });
    it('rejects invalid access code', async () => {
        const res = await request('GET', '/api/teams/validate-access-code?access_code=WRONG');
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(false);
    });
});
describe('E2E: team login', () => {
    it('logs in with valid credentials', async () => {
        insertTeam();
        const res = await request('POST', '/api/auth/team/login', {
            email: 'e2e@test.com',
            password: 'password123',
        });
        expect(res.status).toBe(200);
        expect(res.body.team).toBeDefined();
        expect(res.body.team.name).toBe('E2E Team');
        expect(res.headers['set-cookie']).toBeDefined();
    });
    it('rejects invalid password', async () => {
        insertTeam();
        const res = await request('POST', '/api/auth/team/login', {
            email: 'e2e@test.com',
            password: 'wrongpassword',
        });
        expect(res.status).toBe(401);
    });
    it('rejects non-existent email', async () => {
        const res = await request('POST', '/api/auth/team/login', {
            email: 'nobody@test.com',
            password: 'password123',
        });
        expect(res.status).toBe(401);
    });
});
describe('E2E: admin login', () => {
    it('logs in with valid credentials', async () => {
        insertUser();
        const res = await request('POST', '/api/auth/admin/login', {
            email: 'admin@e2e.com',
            password: 'admin123',
        });
        expect(res.status).toBe(200);
        expect(res.body.user).toBeDefined();
        expect(res.body.user.role).toBe('admin');
    });
});
describe('E2E: guest RSVP', () => {
    it('creates a guest RSVP', async () => {
        const res = await request('POST', '/api/guests/rsvp', {
            name: 'Guest E2E',
            email: 'guest@e2e.com',
            num_people: 2,
        });
        expect(res.status).toBe(201);
        expect(res.body.access_code).toBeDefined();
    });
    it('rejects duplicate email', async () => {
        await request('POST', '/api/guests/rsvp', { name: 'Guest E2E', email: 'guest@e2e.com' });
        const res = await request('POST', '/api/guests/rsvp', { name: 'Guest E2E Again', email: 'guest@e2e.com' });
        expect(res.status).toBe(409);
    });
    it('validates email format', async () => {
        const res = await request('POST', '/api/guests/rsvp', { name: 'Bad Email', email: 'not-an-email' });
        expect(res.status).toBe(400);
    });
    it('validates guest access code', async () => {
        await request('POST', '/api/guests/rsvp', { name: 'Code Test', email: 'codetest@e2e.com' });
        const rows = db.exec("SELECT access_code FROM guests WHERE email = 'codetest@e2e.com'");
        const code = rows[0].values[0][0];
        const res = await request('GET', `/api/guests/validate-access-code?access_code=${code}`);
        expect(res.status).toBe(200);
        expect(res.body.valid).toBe(true);
        expect(res.body.name).toBe('Code Test');
    });
});
describe('E2E: chat messages', () => {
    it('fetches global messages (empty)', async () => {
        const res = await request('GET', '/api/chat/global/messages?limit=10');
        expect(res.status).toBe(200);
        expect(res.body.messages).toEqual([]);
    });
    it('posts a global message as guest', async () => {
        const res = await request('POST', '/api/chat/global/messages', {
            sender_name: 'Test Guest',
            content: 'Hello from E2E!',
        });
        expect(res.status).toBe(201);
        expect(res.body.message).toBeDefined();
        expect(res.body.message.content).toBe('Hello from E2E!');
    });
    it('rejects empty message', async () => {
        const res = await request('POST', '/api/chat/global/messages', { content: '' });
        expect(res.status).toBe(400);
    });
    it('rejects message over 2000 chars', async () => {
        const res = await request('POST', '/api/chat/global/messages', { content: 'x'.repeat(2001) });
        expect(res.status).toBe(400);
    });
    it('posts and retrieves messages in order', async () => {
        await request('POST', '/api/chat/global/messages', { content: 'First' });
        await request('POST', '/api/chat/global/messages', { content: 'Second' });
        const res = await request('GET', '/api/chat/global/messages?limit=10');
        expect(res.body.messages).toHaveLength(2);
        expect(res.body.messages[0].content).toBe('First');
        expect(res.body.messages[1].content).toBe('Second');
    });
    it('posts message with auth token', async () => {
        insertTeam();
        const token = makeToken('team', { team_id: 1, team_slug: 'e2e-team', name: 'E2E Team' });
        const res = await request('POST', '/api/chat/global/messages', {
            content: 'Authenticated message',
        }, { Authorization: `Bearer ${token}` });
        expect(res.status).toBe(201);
        expect(res.body.message.sender_role).toBe('team');
    });
});
describe('E2E: team-scoped chat', () => {
    it('posts and retrieves team messages', async () => {
        insertTeam();
        const token = makeToken('team', { team_id: 1, team_slug: 'e2e-team', name: 'E2E Team' });
        const postRes = await request('POST', '/api/chat/team/e2e-team/messages', {
            content: 'Team private msg',
        }, { Authorization: `Bearer ${token}` });
        expect(postRes.status).toBe(201);
        const getRes = await request('GET', '/api/chat/team/e2e-team/messages?limit=10', undefined, {
            Authorization: `Bearer ${token}`,
        });
        expect(getRes.status).toBe(200);
        expect(getRes.body.messages).toHaveLength(1);
        expect(getRes.body.messages[0].content).toBe('Team private msg');
    });
    it('rejects unauthenticated access', async () => {
        insertTeam();
        const res = await request('GET', '/api/chat/team/e2e-team/messages?limit=10');
        expect(res.status).toBe(401);
    });
});
