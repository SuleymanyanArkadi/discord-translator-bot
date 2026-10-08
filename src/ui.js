import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { describeLanguage } from './languages.js';
import { NO_PING, truncate } from './utils.js';

export const BUTTON_PREFIX = 'tr:';
export const SETLANG_HINT = '💡 Язык для 🌐 не задан, поэтому использован английский. Выберите свой: `/setlang`.';

/** Сообщение «<@user>, перевод готов 🇷🇺» с кнопкой — без пинга. */
export function buildReadyMessage(userId, flag, pendingId) {
  const button = new ButtonBuilder()
    .setCustomId(BUTTON_PREFIX + pendingId)
    .setLabel('Показать перевод')
    .setStyle(ButtonStyle.Primary);
  return {
    content: `<@${userId}>, перевод готов ${flag}`,
    components: [new ActionRowBuilder().addComponents(button)],
    allowedMentions: NO_PING,
  };
}

/** Склеивает переведённые фрагменты (текст + embed'ы) в один текст. */
export function composeParts(parts) {
  const blocks = [];
  let current = null;
  for (const part of parts) {
    if (part.kind === 'content') {
      blocks.push(part.text);
      current = null;
    } else {
      // Заголовок и описание одного embed'а идут одним блоком.
      if (!current || current.embedIndex !== part.embedIndex) {
        current = { embedIndex: part.embedIndex, lines: [] };
        blocks.push(current);
      }
      current.lines.push(part.kind === 'embedTitle' ? `**${part.text}**` : part.text);
    }
  }
  return blocks.map((b) => (typeof b === 'string' ? b : b.lines.join('\n'))).join('\n\n');
}

/** Достаёт из сообщения всё, что можно перевести: текст и title/description embed'ов. */
export function extractParts(message) {
  const parts = [];
  if (message.content?.trim()) parts.push({ kind: 'content', text: message.content });
  (message.embeds ?? []).forEach((embed, embedIndex) => {
    if (embed.title?.trim()) parts.push({ kind: 'embedTitle', embedIndex, text: embed.title });
    if (embed.description?.trim()) parts.push({ kind: 'embedDescription', embedIndex, text: embed.description });
  });
  return parts;
}

/**
 * Embed с переводом.
 * @param {object} p
 * @param {string} p.text переведённый текст
 * @param {string|null} p.sourceLang
 * @param {string} p.targetLang
 * @param {string|null} p.provider
 * @param {boolean} p.sameLanguage
 * @param {string} [p.url] ссылка на оригинал
 * @param {string} [p.authorName]
 */
export function buildTranslationEmbed({ text, sourceLang, targetLang, provider, sameLanguage, url, authorName }) {
  const target = describeLanguage(targetLang);
  const source = sourceLang ? describeLanguage(sourceLang) : 'Авто';
  const body = sameLanguage ? `ℹ️ Сообщение уже на языке **${target}**.\n\n${text}` : text;

  const embed = new EmbedBuilder()
    .setColor(sameLanguage ? 0x99aab5 : 0x5865f2)
    .setTitle(`${source} → ${target}`)
    .setDescription(truncate(body) || '—');

  if (authorName) embed.setAuthor({ name: truncate(authorName, 256, '…') });
  if (url) embed.addFields({ name: 'Оригинал', value: `[Перейти к сообщению](${url})` });
  if (provider) embed.setFooter({ text: `Переводчик: ${provider}` });
  return embed;
}
