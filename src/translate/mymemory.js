import { normalizeLangCode } from '../languages.js';
import { chunkText } from '../utils.js';

const ENDPOINT = 'https://api.mymemory.translated.net/get';
// Бесплатный запрос MyMemory — не больше 500 байт текста.
const MAX_BYTES = 480;

/** Делит текст на куски не длиннее MAX_BYTES в UTF-8. */
export function chunkByBytes(text) {
  return chunkText(text, 400).flatMap((c) => (Buffer.byteLength(c) > MAX_BYTES ? chunkText(c, 120) : [c]));
}

/**
 * MyMemory (api.mymemory.translated.net): без ключа, 5000 символов в день,
 * 50 000 — если указать email (MYMEMORY_EMAIL).
 */
export class MyMemoryProvider {
  name = 'MyMemory';

  constructor({ email = '', fetchImpl = globalThis.fetch, timeoutMs = 10_000 } = {}) {
    this.email = email;
    this.fetch = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  isAvailable() {
    return typeof this.fetch === 'function';
  }

  async supports(lang) {
    return Boolean(lang);
  }

  async translate(text, lang) {
    let sourceLang = null;
    const parts = [];
    for (const chunk of chunkByBytes(text)) {
      if (!chunk.trim()) {
        parts.push(chunk);
        continue;
      }
      const res = await this.#request(chunk, lang);
      parts.push(res.text);
      sourceLang ??= res.sourceLang;
    }
    return { text: parts.join(''), sourceLang };
  }

  async #request(text, lang) {
    const params = new URLSearchParams({ q: text, langpair: `autodetect|${lang}` });
    if (this.email) params.set('de', this.email);
    const res = await this.fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw Object.assign(new Error(`MyMemory: HTTP ${res.status}`), { status: res.status });
    const data = await res.json();
    const status = Number(data?.responseStatus);
    const details = String(data?.responseDetails ?? '');

    // Исходный язык совпадает с целевым — переводить нечего.
    if (/two distinct languages/i.test(details)) return { text, sourceLang: normalizeLangCode(lang) };
    if (data?.quotaFinished || status === 429) {
      throw Object.assign(new Error('MyMemory: дневной лимит исчерпан'), { status: 429 });
    }
    if (status !== 200 || typeof data?.responseData?.translatedText !== 'string') {
      throw new Error(`MyMemory: ${details || `статус ${status}`}`);
    }
    return {
      text: data.responseData.translatedText,
      sourceLang: normalizeLangCode(data.responseData.detectedLanguage),
    };
  }
}
