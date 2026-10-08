import { translate as vitaletsTranslate } from '@vitalets/google-translate-api';
import { normalizeLangCode } from '../languages.js';
import { chunkText } from '../utils.js';

// Google Translate принимает до ~5000 символов за запрос.
const CHUNK_SIZE = 4500;

/** Google Translate через пакет @vitalets/google-translate-api (translate.google.com, без ключа). */
export class VitaletsProvider {
  name = 'Google Translate';

  /** @param {{ translateFn?: typeof vitaletsTranslate, timeoutMs?: number }} [opts] */
  constructor({ translateFn = vitaletsTranslate, timeoutMs = 10_000 } = {}) {
    this.translateFn = translateFn;
    this.timeoutMs = timeoutMs;
  }

  isAvailable() {
    return true;
  }

  async supports(lang) {
    return Boolean(lang);
  }

  async translate(text, lang) {
    let sourceLang = null;
    const parts = [];
    for (const chunk of chunkText(text, CHUNK_SIZE)) {
      const res = await this.translateFn(chunk, {
        to: lang,
        fetchOptions: { signal: AbortSignal.timeout(this.timeoutMs) },
      });
      parts.push(res.text);
      sourceLang ??= normalizeLangCode(res.raw?.src);
    }
    return { text: parts.join(''), sourceLang };
  }
}
