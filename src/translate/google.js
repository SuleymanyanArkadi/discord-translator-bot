import { normalizeLangCode } from '../languages.js';
import { chunkText } from '../utils.js';

const ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
// GET-запрос: держим URL в разумных пределах (CJK в URL-кодировке ~9 символов на знак).
const CHUNK_SIZE = 800;

/** Бесплатный Google Translate без ключа (публичный эндпоинт client=gtx). */
export class GoogleProvider {
  name = 'Google Translate';

  constructor({ fetchImpl = globalThis.fetch, timeoutMs = 10_000 } = {}) {
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
    for (const chunk of chunkText(text, CHUNK_SIZE)) {
      const res = await this.#request(chunk, lang);
      parts.push(res.text);
      sourceLang ??= res.sourceLang;
    }
    return { text: parts.join(''), sourceLang };
  }

  async #request(text, lang) {
    const url = new URL(ENDPOINT);
    url.search = new URLSearchParams({ client: 'gtx', sl: 'auto', tl: lang, dt: 't', q: text }).toString();
    const res = await this.fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) throw new Error(`Google Translate: HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.[0])) throw new Error('Google Translate: неожиданный формат ответа');
    return {
      text: data[0].map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : '')).join(''),
      sourceLang: normalizeLangCode(data[2]),
    };
  }
}
