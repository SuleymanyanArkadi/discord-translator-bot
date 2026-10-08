import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { log } from './logger.js';

let db = null;
let stmts = null;

function open() {
  if (db) return db;
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id    TEXT PRIMARY KEY,
      lang       TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  stmts = {
    get: db.prepare('SELECT lang FROM user_settings WHERE user_id = ?'),
    upsert: db.prepare(`
      INSERT INTO user_settings (user_id, lang, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET lang = excluded.lang, updated_at = excluded.updated_at
    `),
  };
  log.info(`База данных открыта: ${config.dbPath}`);
  return db;
}

export function initDb() {
  open();
}

/** Язык пользователя по умолчанию или null. */
export function getUserLang(userId) {
  open();
  return stmts.get.get(String(userId))?.lang ?? null;
}

export function setUserLang(userId, lang) {
  open();
  stmts.upsert.run(String(userId), lang, Date.now());
}

export function closeDb() {
  if (!db) return;
  try {
    db.close();
    log.info('База данных закрыта');
  } catch (err) {
    log.warn('Ошибка при закрытии БД:', err.message);
  } finally {
    db = null;
    stmts = null;
  }
}
