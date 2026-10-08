import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAILURE_MESSAGE, TranslationError, createTranslator, translateParts } from '../src/translate/index.js';
import { GoogleProvider } from '../src/translate/google.js';
import { LRUCache } from '../src/translate/lru.js';

const silent = { warn() {}, info() {}, error() {} };

function mockProvider(name, { available = true, supports = () => true, translate } = {}) {
  const p = {
    name,
    calls: 0,
    isAvailable: () => available,
    supports: async (lang) => supports(lang),
    async translate(text, lang) {
      p.calls++;
      if (translate) return translate(text, lang);
      return { text: `${name}:${lang}:${text}`, sourceLang: 'en' };
    },
  };
  return p;
}

const make = (providers) => createTranslator({ providers, cache: new LRUCache(100), logger: silent });

test('используется DeepL, если всё в порядке', async () => {
  const deepl = mockProvider('DeepL');
  const google = mockProvider('Google');
  const r = await make([deepl, google]).translate('hello', 'ru');
  assert.deepEqual(r, { text: 'DeepL:ru:hello', sourceLang: 'en', provider: 'DeepL' });
  assert.equal(google.calls, 0);
});

test('фолбэк на Google, если DeepL не поддерживает язык', async () => {
  const deepl = mockProvider('DeepL', { supports: (l) => l !== 'hy' });
  const google = mockProvider('Google');
  const r = await make([deepl, google]).translate('hello', 'hy');
  assert.equal(r.provider, 'Google');
  assert.equal(deepl.calls, 0);
});

test('фолбэк на Google, если ключ DeepL не задан', async () => {
  const deepl = mockProvider('DeepL', { available: false });
  const google = mockProvider('Google');
  const r = await make([deepl, google]).translate('hello', 'ru');
  assert.equal(r.provider, 'Google');
});

test('фолбэк на Google при ошибке квоты / любой ошибке DeepL', async () => {
  const deepl = mockProvider('DeepL', {
    translate: () => {
      throw Object.assign(new Error('Quota exceeded'), { statusCode: 456 });
    },
  });
  const google = mockProvider('Google');
  const r = await make([deepl, google]).translate('hello', 'de');
  assert.equal(r.provider, 'Google');
  assert.equal(deepl.calls, 1);
});

test('фолбэк, если supports() бросает исключение', async () => {
  const deepl = mockProvider('DeepL', {
    supports: () => {
      throw new Error('languages endpoint down');
    },
  });
  const google = mockProvider('Google');
  assert.equal((await make([deepl, google]).translate('x', 'ru')).provider, 'Google');
});

test('если упали оба — понятная TranslationError', async () => {
  const boom = () => {
    throw new Error('boom');
  };
  const t = make([mockProvider('DeepL', { translate: boom }), mockProvider('Google', { translate: boom })]);
  await assert.rejects(t.translate('hello', 'ru'), (err) => {
    assert.ok(err instanceof TranslationError);
    assert.equal(err.message, FAILURE_MESSAGE);
    assert.equal(err.causes.length, 2);
    return true;
  });
});

test('повторный запрос берётся из кэша', async () => {
  const deepl = mockProvider('DeepL');
  const t = make([deepl]);
  await t.translate('hello', 'ru');
  const r = await t.translate('hello', 'ru');
  assert.equal(deepl.calls, 1);
  assert.equal(r.cached, true);
  await t.translate('hello', 'de'); // другой язык — другой ключ
  assert.equal(deepl.calls, 2);
});

test('ошибки не кэшируются', async () => {
  let fail = true;
  const p = mockProvider('Google', {
    translate: (text, lang) => {
      if (fail) throw new Error('temporary');
      return { text: 'ok', sourceLang: 'en' };
    },
  });
  const t = make([p]);
  await assert.rejects(t.translate('a', 'ru'));
  fail = false;
  assert.equal((await t.translate('a', 'ru')).text, 'ok');
});

test('пустой текст не отправляется провайдерам', async () => {
  const p = mockProvider('DeepL');
  const r = await make([p]).translate('   ', 'ru');
  assert.equal(p.calls, 0);
  assert.equal(r.provider, null);
});

test('translateParts собирает части и определяет совпадение языков', async () => {
  const fn = async (text, lang) => ({ text: text.toUpperCase(), sourceLang: 'ru', provider: 'Mock' });
  const r = await translateParts([{ kind: 'content', text: 'привет' }, { kind: 'embedTitle', embedIndex: 0, text: 'мир' }], 'ru', fn);
  assert.deepEqual(r.parts.map((p) => p.text), ['ПРИВЕТ', 'МИР']);
  assert.equal(r.sameLanguage, true);
  assert.equal(r.provider, 'Mock');
  const r2 = await translateParts([{ kind: 'content', text: 'x' }], 'en', fn);
  assert.equal(r2.sameLanguage, false);
});

test('GoogleProvider разбирает ответ gtx и склеивает куски', async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const q = new URL(url).searchParams.get('q');
    return {
      ok: true,
      json: async () => [[[`<${q.length}>`, q, null, null]], null, 'iw'],
    };
  };
  const g = new GoogleProvider({ fetchImpl });
  const long = 'Слово. '.repeat(300); // 2100 символов -> несколько запросов
  const r = await g.translate(long, 'en');
  assert.ok(urls.length >= 3);
  assert.ok(urls.every((u) => u.includes('client=gtx') && u.includes('tl=en')));
  assert.equal(r.sourceLang, 'he'); // 'iw' нормализован
});

test('GoogleProvider: HTTP-ошибка превращается в исключение', async () => {
  const g = new GoogleProvider({ fetchImpl: async () => ({ ok: false, status: 429 }) });
  await assert.rejects(g.translate('hi', 'ru'), /429/);
});
