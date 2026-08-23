import bcrypt from 'bcrypt';
import { getDb, saveDb } from './db.js';
export function seedAdmin() {
    const db = getDb();
    const email = process.env.ADMIN_EMAIL || 'admin@cook-tournament.com';
    const password = process.env.ADMIN_PASSWORD || 'changeme';
    const existing = db.exec('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0 && existing[0].values.length > 0)
        return;
    const hash = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)', [email, hash, 'Admin', 'admin']);
    saveDb();
    console.log(`Admin user seeded: ${email}`);
}
