import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { log } from '../logger.js';
import { isSameLanguage } from '../languages.js';
import { DeepLProvider } from './deepl.js';
import { GoogleProvider } from './google.js';
import { LRUCache } from './lru.js';
import { TranslationError } from './errors.js';

export { TranslationError };

export const FAILURE_MESSAGE =
  'Не удалось перевести: сервисы перевода сейчас недоступны. Попробуйте ещё раз чуть позже.';

export function cacheKey(text, targetLang) {
  return `${createHash('sha1').update(text).digest('hex')}:${targetLang}`;
}

/**
 * Создаёт переводчик с цепочкой провайдеров (по порядку приоритета) и LRU-кэшем.
 * Провайдер: { name, isAvailable(), supports(lang): Promise<bool>, translate(text, lang): Promise<{text, sourceLang}> }
 */
export function createTranslator({ providers, cache = new LRUCache(config.cacheSize), logger = log }) {
  async function translate(text, targetLang) {
    const source = String(text ?? '');
    if (!source.trim()) return { text: source, sourceLang: null, provider: null };

    const key = cacheKey(source, targetLang);
    const cached = cache.get(key);
    if (cached) return { ...cached, cached: true };

    const causes = [];
    for (const provider of providers) {
      if (!provider.isAvailable()) continue;
      let ok = false;
      try {
        ok = await provider.supports(targetLang);
      } catch (err) {
        logger.warn(`${provider.name}: ошибка проверки языка ${targetLang}:`, err.message);
      }
      if (!ok) continue;
      try {
        const res = await provider.translate(source, targetLang);
        const result = { text: res.text, sourceLang: res.sourceLang ?? null, provider: provider.name };
        cache.set(key, result);
        return result;
      } catch (err) {
        causes.push(err);
        logger.warn(`${provider.name}: ошибка перевода на ${targetLang}, пробуем следующий провайдер:`, err.message);
      }
    }
    throw new TranslationError(FAILURE_MESSAGE, { causes });
  }

  return { translate, cache, providers };
}

let defaultTranslator = null;

export function getTranslator() {
  defaultTranslator ??= createTranslator({
    providers: [new DeepLProvider({ apiKey: config.deeplApiKey }), new GoogleProvider()],
  });
  return defaultTranslator;
}

/** Вызывается при старте: подгружает и кэширует список языков DeepL. */
export async function initTranslation() {
  const [deeplProvider] = getTranslator().providers;
  if (!deeplProvider.isAvailable()) {
    log.warn('DEEPL_API_KEY не задан — все переводы пойдут через Google Translate');
    return;
  }
  try {
    await deeplProvider.loadLanguages();
  } catch (err) {
    log.warn('DeepL недоступен при старте, будет использован Google Translate:', err.message);
  }
}

/** translate(text, targetLang) -> { text, sourceLang, provider } */
export function translate(text, targetLang) {
  return getTranslator().translate(text, targetLang);
}

/**
 * Переводит несколько фрагментов (текст сообщения, заголовки и описания embed'ов).
 * @param {{label?: string, text: string}[]} parts
 */
export async function translateParts(parts, targetLang, translateFn = translate) {
  const results = await Promise.all(parts.map((p) => translateFn(p.text, targetLang)));
  const sourceLang = results.find((r) => r.sourceLang)?.sourceLang ?? null;
  const providers = [...new Set(results.map((r) => r.provider).filter(Boolean))];
  return {
    parts: parts.map((p, i) => ({ ...p, text: results[i].text })),
    sourceLang,
    provider: providers.join(' + ') || null,
    sameLanguage: isSameLanguage(sourceLang, targetLang),
  };
}
