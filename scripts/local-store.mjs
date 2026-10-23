import { DatabaseSync } from 'node:sqlite';
export class LocalStore {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec('CREATE TABLE IF NOT EXISTS notes(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER, expires INTEGER);');
  }
  async list(all = false) { return this.db.prepare('SELECT data FROM notes').all().map(r => JSON.parse(r.data)).filter(r => all || r.status === 'published').sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async get(id) { const r = this.db.prepare('SELECT data FROM notes WHERE id=?').get(id); return r ? JSON.parse(r.data) : null; }
  async create(note, key) {
    const now = Date.now(); this.db.exec('BEGIN IMMEDIATE');
    try {
      const limit = this.db.prepare('SELECT count,expires FROM limits WHERE key=?').get(key);
      if (limit && limit.expires > now && limit.count >= 5) { this.db.exec('ROLLBACK'); return false; }
      const count = limit && limit.expires > now ? limit.count + 1 : 1;
      const expires = limit && limit.expires > now ? limit.expires : now + 600000;
      this.db.prepare('INSERT OR REPLACE INTO limits VALUES (?,?,?)').run(key, count, expires);
      this.db.prepare('INSERT INTO notes VALUES (?,?)').run(note.id, JSON.stringify(note)); this.db.exec('COMMIT'); return true;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  async update(note) { this.db.prepare('UPDATE notes SET data=? WHERE id=?').run(JSON.stringify(note), note.id); }
  async remove(id) { this.db.prepare('DELETE FROM notes WHERE id=?').run(id); }
  close() { this.db.close(); }
}
