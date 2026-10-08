import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function positiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const env = (name) => process.env[name]?.trim() || '';

export const config = {
  token: env('DISCORD_TOKEN'),
  clientId: env('CLIENT_ID'),
  guildId: env('GUILD_ID'),
  deeplApiKey: env('DEEPL_API_KEY'),
  buttonTimeoutMs: positiveInt(process.env.BUTTON_TIMEOUT_SECONDS, 7) * 1000,
  dbPath: env('DB_PATH') || path.join(ROOT_DIR, 'data', 'bot.db'),
  defaultLang: 'en',
  rateLimit: { limit: 10, windowMs: 60_000 },
  cacheSize: 1000,
};
