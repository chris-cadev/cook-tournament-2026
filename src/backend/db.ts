import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'championship.db');

let db: SqlJsDatabase;

export async function getDb(): Promise<SqlJsDatabase> {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      db = new SQL.Database();
    }
    migrate(db);
    saveDb();
  }
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

function migrate(db: SqlJsDatabase) {
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sandwich_name TEXT,
      captain_email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      members TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','disqualified')),
      station TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anonymous_id TEXT UNIQUE NOT NULL,
      name TEXT,
      accessed_at TEXT
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel TEXT NOT NULL,
      sender_id INTEGER,
      sender_name TEXT NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('admin','team','judge','guest')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel, created_at);
  `);
}

export interface QueryResult {
  [key: string]: unknown;
}

export function queryAll(sql: string, params: unknown[] = []): QueryResult[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: QueryResult[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as QueryResult);
  }
  stmt.free();
  return rows;
}

export function queryOne(sql: string, params: unknown[] = []): QueryResult | undefined {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row: QueryResult | undefined;
  if (stmt.step()) {
    row = stmt.getAsObject() as QueryResult;
  }
  stmt.free();
  return row;
}

export function run(sql: string, params: unknown[] = []): { lastInsertRowid: number; changes: number } {
  db.run(sql, params);
  const changes = db.getRowsModified();
  const lastRow = queryOne('SELECT last_insert_rowid() as id');
  return { lastInsertRowid: Number(lastRow?.id) || 0, changes };
}
