import { Events } from 'discord.js';
import { log } from '../logger.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    log.info(`Бот запущен как ${client.user.tag}, серверов: ${client.guilds.cache.size}`);
  },
};
