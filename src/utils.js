import { log } from './logger.js';

export const EMBED_DESCRIPTION_LIMIT = 4096;
export const TRUNCATION_NOTE = '\n\n… *(текст обрезан из-за лимита Discord)*';

/** Обрезает строку до max символов с пометкой, не разрывая суррогатные пары. */
export function truncate(text, max = EMBED_DESCRIPTION_LIMIT, note = TRUNCATION_NOTE) {
  const s = String(text ?? '');
  if (s.length <= max) return s;
  let cut = s.slice(0, Math.max(0, max - note.length));
  const last = cut.charCodeAt(cut.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return cut + note;
}

/**
 * Делит текст на куски длиной <= max, по возможности по переводам строк,
 * концам предложений или пробелам. Склейка кусков даёт исходный текст.
 */
export function chunkText(text, max) {
  const chunks = [];
  let rest = String(text);
  while (rest.length > max) {
    const window = rest.slice(0, max);
    let at = window.lastIndexOf('\n');
    if (at < max / 2) at = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
    if (at < max / 2) at = window.lastIndexOf(' ');
    let end = at > 0 ? at + 1 : max;
    const code = rest.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff) end -= 1;
    chunks.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  if (rest) chunks.push(rest);
  return chunks;
}

const IGNORED_CODES = new Set([10008, 10003]); // Unknown Message, Unknown Channel

/** Удаляет сообщение, не падая, если его уже удалили вручную. */
export async function safeDelete(message) {
  if (!message) return;
  try {
    await message.delete();
  } catch (err) {
    if (!IGNORED_CODES.has(err?.code)) log.warn('Не удалось удалить сообщение:', err?.message ?? err);
  }
}

export const NO_PING = Object.freeze({ parse: [], repliedUser: false });
