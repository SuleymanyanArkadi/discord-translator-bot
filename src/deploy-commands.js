import { REST, Routes } from 'discord.js';
import { commandsJSON } from './commands/index.js';
import { config } from './config.js';
import { log } from './logger.js';

if (!config.token || !config.clientId) {
  log.error('Нужны DISCORD_TOKEN и CLIENT_ID в .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(config.token);

try {
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commandsJSON });
    log.info(`Зарегистрировано ${commandsJSON.length} команд на сервере ${config.guildId} (появятся сразу)`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commandsJSON });
    log.info(`Зарегистрировано ${commandsJSON.length} глобальных команд (появление может занять до часа)`);
  }
} catch (err) {
  log.error('Не удалось зарегистрировать команды:', err?.message ?? err);
  process.exit(1);
}
