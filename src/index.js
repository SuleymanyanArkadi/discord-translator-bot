import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config.js';
import { closeDb, initDb } from './db.js';
import { events } from './events/index.js';
import { log } from './logger.js';
import { pending } from './pending.js';
import { initTranslation } from './translate/index.js';
import { safeDelete } from './utils.js';

if (!config.token) {
  log.error('DISCORD_TOKEN не задан. Скопируйте .env.example в .env и заполните его.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
  ],
  // Partials нужны, чтобы получать реакции на старые / некэшированные сообщения.
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

for (const event of events) {
  const handler = (...args) => event.execute(...args, client);
  if (event.once) client.once(event.name, handler);
  else client.on(event.name, handler);
}

client.on('error', (err) => log.error('Ошибка клиента Discord:', err));
client.on('warn', (msg) => log.warn('Discord:', msg));

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info(`Получен ${signal}, завершаем работу…`);
  try {
    // Убираем висящие кнопки, но не ждём дольше 3 секунд.
    const leftovers = pending.drain().map((e) => safeDelete(e.message));
    await Promise.race([Promise.allSettled(leftovers), new Promise((r) => setTimeout(r, 3000))]);
    await client.destroy();
  } catch (err) {
    log.warn('Ошибка при остановке клиента:', err?.message ?? err);
  } finally {
    closeDb();
    process.exit(0);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => log.error('Необработанное отклонение промиса:', err));

try {
  initDb();
  await initTranslation();
  await client.login(config.token);
} catch (err) {
  log.error('Не удалось запустить бота:', err?.message ?? err);
  closeDb();
  process.exit(1);
}
