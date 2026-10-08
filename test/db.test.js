import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// DB_PATH нужно выставить до загрузки config.js, поэтому импорт динамический.
const dir = mkdtempSync(path.join(tmpdir(), 'translator-db-'));
process.env.DB_PATH = path.join(dir, 'bot.db');
const { getUserLang, setUserLang, closeDb } = await import('../src/db.js');

test('БД: сохранение и обновление языка пользователя', () => {
  try {
    assert.equal(getUserLang('42'), null);
    setUserLang('42', 'ru');
    assert.equal(getUserLang('42'), 'ru');
    setUserLang('42', 'hy');
    assert.equal(getUserLang('42'), 'hy');
    closeDb();
    assert.equal(getUserLang('42'), 'hy'); // после переоткрытия данные на месте
  } finally {
    closeDb();
    rmSync(dir, { recursive: true, force: true });
  }
});
