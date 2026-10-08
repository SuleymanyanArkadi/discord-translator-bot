import * as deepl from 'deepl-node';
import { normalizeLangCode } from '../languages.js';
import { log } from '../logger.js';

// Наши коды -> коды DeepL. Для EN и PT DeepL требует указать вариант.
const TO_DEEPL = {
  en: 'EN-US',
  pt: 'PT-BR',
  zh: 'ZH-HANS',
  'zh-cn': 'ZH-HANS',
  'zh-tw': 'ZH-HANT',
  no: 'NB',
  nb: 'NB',
};

/** Нормализует код языка под DeepL: 'en' -> 'EN-US', 'pt' -> 'PT-BR', 'zh-CN' -> 'ZH-HANS', 'ru' -> 'RU'. */
export function toDeepLTarget(lang) {
  const lower = String(lang).trim().toLowerCase();
  return TO_DEEPL[lower] ?? lower.toUpperCase();
}

/**
 * Возвращает код, подходящий для DeepL, если язык поддерживается, иначе null.
 * @param {string} lang наш код языка
 * @param {Map<string,string>|Set<string>} supported коды DeepL в ВЕРХНЕМ регистре (Map: upper -> оригинал)
 */
export function resolveDeepLTarget(lang, supported) {
  if (!lang || !supported) return null;
  const pick = (code) => (supported instanceof Map ? supported.get(code) : code);
  const candidate = toDeepLTarget(lang);
  if (supported.has(candidate)) return pick(candidate);
  // Старые списки DeepL содержат просто 'ZH' (упрощённый китайский).
  if (candidate === 'ZH-HANS' && supported.has('ZH')) return pick('ZH');
  return null;
}

/** Код исходного языка от DeepL -> наш код: 'EN' -> 'en', 'ZH' -> 'zh-CN', 'NB' -> 'no'. */
export function fromDeepLSource(code) {
  if (!code) return null;
  return normalizeLangCode(code);
}

export function isQuotaError(err) {
  return (
    err instanceof deepl.QuotaExceededError ||
    err?.statusCode === 456 ||
    /\b456\b|quota/i.test(err?.message ?? '')
  );
}

export class DeepLProvider {
  name = 'DeepL';
  #targets = null; // Map<UPPER, original>
  #loading = null;
  #disabledUntil = 0;

  /**
   * @param {object} opts
   * @param {string} [opts.apiKey]
   * @param {object} [opts.client] объект с getTargetLanguages()/translateText() (для тестов)
   */
  constructor({ apiKey, client, quotaCooldownMs = 60 * 60 * 1000, now = Date.now } = {}) {
    this.client = client ?? (apiKey ? new deepl.Translator(apiKey, { maxRetries: 2 }) : null);
    this.quotaCooldownMs = quotaCooldownMs;
    this.now = now;
  }

  isAvailable() {
    return Boolean(this.client) && this.now() >= this.#disabledUntil;
  }

  /** Загружает и кэширует список целевых языков DeepL. */
  async loadLanguages() {
    if (!this.client) return null;
    if (this.#targets) return this.#targets;
    this.#loading ??= this.client
      .getTargetLanguages()
      .then((list) => {
        this.#targets = new Map(list.map((l) => [l.code.toUpperCase(), l.code]));
        log.info(`DeepL: загружено ${this.#targets.size} целевых языков`);
        return this.#targets;
      })
      .finally(() => {
        this.#loading = null;
      });
    return this.#loading;
  }

  async supports(lang) {
    if (!this.#targets) {
      try {
        await this.loadLanguages();
      } catch (err) {
        this.#handleError(err);
        log.warn('DeepL: не удалось получить список языков:', err.message);
        return false;
      }
    }
    return resolveDeepLTarget(lang, this.#targets) !== null;
  }

  async translate(text, lang) {
    const target = resolveDeepLTarget(lang, this.#targets);
    if (!target) throw new Error(`DeepL не поддерживает язык ${lang}`);
    try {
      const res = await this.client.translateText(text, null, target);
      return { text: res.text, sourceLang: fromDeepLSource(res.detectedSourceLang) };
    } catch (err) {
      this.#handleError(err);
      throw err;
    }
  }

  #handleError(err) {
    if (isQuotaError(err)) {
      this.#disabledUntil = this.now() + this.quotaCooldownMs;
      log.warn('DeepL: квота исчерпана (456), временно переключаемся на Google');
    } else if (err instanceof deepl.AuthorizationError) {
      this.#disabledUntil = this.now() + this.quotaCooldownMs;
      log.warn('DeepL: неверный DEEPL_API_KEY, временно переключаемся на Google');
    }
  }
}
