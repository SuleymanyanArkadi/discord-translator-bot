import { Events, RESTJSONErrorCodes } from 'discord.js';
import { config } from '../config.js';
import { getUserLang } from '../db.js';
import { parseReactionEmoji } from '../flags.js';
import { log } from '../logger.js';
import { pending } from '../pending.js';
import { KeyedQueue } from '../queue.js';
import { rateLimiter } from '../ratelimit.js';
import { TranslationError, translateParts } from '../translate/index.js';
import { buildReadyMessage, extractParts } from '../ui.js';
import { NO_PING, safeDelete } from '../utils.js';

const queue = new KeyedQueue();
const warnedChannels = new Set();

async function removeUserReaction(reaction, userId) {
  try {
    await reaction.users.remove(userId);
  } catch (err) {
    const channelId = reaction.message.channelId;
    if (err?.code === RESTJSONErrorCodes.MissingPermissions || err?.code === RESTJSONErrorCodes.MissingAccess) {
      if (!warnedChannels.has(channelId)) {
        warnedChannels.add(channelId);
        log.warn(`Нет права Manage Messages в канале ${channelId}: не могу убирать реакции пользователей`);
      }
    } else if (err?.code !== RESTJSONErrorCodes.UnknownMessage) {
      log.warn('Не удалось убрать реакцию:', err?.message ?? err);
    }
  }
}

/** Короткое сообщение об ошибке, которое само исчезает. */
async function sendTemporaryNotice(message, content) {
  try {
    const notice = await message.reply({ content, allowedMentions: NO_PING, failIfNotExists: false });
    setTimeout(() => safeDelete(notice), config.buttonTimeoutMs).unref?.();
  } catch (err) {
    log.warn('Не удалось отправить сообщение об ошибке:', err?.message ?? err);
  }
}

async function processRequest({ message, user, parsed }) {
  const parts = extractParts(message);
  if (parts.length === 0) return; // картинки/стикеры без текста — реакцию уже убрали

  let targetLang = parsed.lang;
  const flag = parsed.emoji;
  let hint = false;
  if (parsed.kind === 'globe') {
    const saved = getUserLang(user.id);
    targetLang = saved ?? config.defaultLang;
    hint = !saved;
  }

  let result;
  try {
    result = await translateParts(parts, targetLang);
  } catch (err) {
    const text = err instanceof TranslationError ? err.message : 'Не удалось перевести сообщение.';
    if (!(err instanceof TranslationError)) log.error('Ошибка перевода:', err);
    await sendTemporaryNotice(message, `<@${user.id}>, ${text.charAt(0).toLowerCase()}${text.slice(1)}`);
    return;
  }

  const id = pending.create({
    userId: user.id,
    targetLang,
    result,
    hint,
    url: message.url,
    authorName: message.member?.displayName ?? message.author?.username ?? null,
  });

  let reply;
  try {
    reply = await message.reply({ ...buildReadyMessage(user.id, flag, id), failIfNotExists: false });
  } catch (err) {
    pending.delete(id);
    log.warn(`Не удалось отправить кнопку в канал ${message.channelId}:`, err?.message ?? err);
    return;
  }

  pending.attach(id, {
    message: reply,
    timeoutMs: config.buttonTimeoutMs,
    onExpire: (entry) => safeDelete(entry.message),
  });
  log.info(`Перевод для ${user.tag ?? user.id} -> ${targetLang} (${result.provider}) готов`);
}

export default {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      const parsed = parseReactionEmoji(reaction.emoji?.name);
      if (!parsed) return; // не флаг и не 🌐 — игнорируем

      if (reaction.partial) reaction = await reaction.fetch();
      if (user.partial) user = await user.fetch();
      if (user.bot) return;

      let message = reaction.message;
      if (message.partial) message = await message.fetch();
      if (!message.inGuild()) return;

      await removeUserReaction(reaction, user.id);

      if (!rateLimiter.hit(user.id)) {
        log.info(`Rate limit: ${user.tag ?? user.id} превысил ${config.rateLimit.limit} переводов в минуту`);
        return;
      }

      await queue.run(`${message.id}:${user.id}`, () => processRequest({ message, user, parsed }));
    } catch (err) {
      if (err?.code === RESTJSONErrorCodes.UnknownMessage) return; // сообщение удалили
      log.error('Ошибка обработки реакции:', err);
    }
  },
};
