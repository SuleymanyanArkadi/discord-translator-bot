import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QuotaExceededError } from 'deepl-node';
import {
  DeepLProvider,
  fromDeepLSource,
  isQuotaError,
  resolveDeepLTarget,
  toDeepLTarget,
} from '../src/translate/deepl.js';

const SUPPORTED = new Map(
  ['bg', 'cs', 'da', 'de', 'el', 'en-GB', 'en-US', 'es', 'fr', 'ja', 'nb', 'pt-BR', 'pt-PT', 'ru', 'uk', 'zh', 'zh-HANS', 'zh-HANT']
    .map((c) => [c.toUpperCase(), c]),
);

test('toDeepLTarget: варианты EN/PT/ZH/NO', () => {
  assert.equal(toDeepLTarget('en'), 'EN-US');
  assert.equal(toDeepLTarget('EN'), 'EN-US');
  assert.equal(toDeepLTarget('pt'), 'PT-BR');
  assert.equal(toDeepLTarget('zh-CN'), 'ZH-HANS');
  assert.equal(toDeepLTarget('zh-TW'), 'ZH-HANT');
  assert.equal(toDeepLTarget('no'), 'NB');
  assert.equal(toDeepLTarget('ru'), 'RU');
  assert.equal(toDeepLTarget('en-gb'), 'EN-GB');
});

test('resolveDeepLTarget учитывает список поддерживаемых языков', () => {
  assert.equal(resolveDeepLTarget('en', SUPPORTED), 'en-US');
  assert.equal(resolveDeepLTarget('pt', SUPPORTED), 'pt-BR');
  assert.equal(resolveDeepLTarget('ru', SUPPORTED), 'ru');
  assert.equal(resolveDeepLTarget('no', SUPPORTED), 'nb');
  assert.equal(resolveDeepLTarget('zh-TW', SUPPORTED), 'zh-HANT');
  assert.equal(resolveDeepLTarget('hy', SUPPORTED), null); // армянского в DeepL нет
  assert.equal(resolveDeepLTarget('ka', SUPPORTED), null);
  assert.equal(resolveDeepLTarget('ru', null), null);
});

test('resolveDeepLTarget: старый список только с ZH', () => {
  const old = new Set(['ZH', 'EN-US']);
  assert.equal(resolveDeepLTarget('zh-CN', old), 'ZH');
  assert.equal(resolveDeepLTarget('zh-TW', old), null);
});

test('fromDeepLSource', () => {
  assert.equal(fromDeepLSource('EN'), 'en');
  assert.equal(fromDeepLSource('ru'), 'ru');
  assert.equal(fromDeepLSource('ZH'), 'zh-CN');
  assert.equal(fromDeepLSource('NB'), 'no');
  assert.equal(fromDeepLSource(undefined), null);
});

test('isQuotaError', () => {
  assert.ok(isQuotaError(new QuotaExceededError('Quota for this billing period has been exceeded')));
  assert.ok(isQuotaError({ statusCode: 456, message: '' }));
  assert.ok(!isQuotaError(new Error('network down')));
});

function fakeClient({ fail } = {}) {
  const calls = [];
  return {
    calls,
    async getTargetLanguages() {
      return [...SUPPORTED.values()].map((code) => ({ code, name: code }));
    },
    async translateText(text, source, target) {
      calls.push({ text, target });
      if (fail) throw fail;
      return { text: `[${target}] ${text}`, detectedSourceLang: 'en' };
    },
  };
}

test('DeepLProvider переводит с нормализованным кодом', async () => {
  const client = fakeClient();
  const p = new DeepLProvider({ client });
  assert.equal(await p.supports('en'), true);
  assert.equal(await p.supports('hy'), false);
  const r = await p.translate('Hallo', 'en');
  assert.deepEqual(r, { text: '[en-US] Hallo', sourceLang: 'en' });
});

test('DeepLProvider без ключа недоступен', () => {
  assert.equal(new DeepLProvider({ apiKey: '' }).isAvailable(), false);
});

test('DeepLProvider отключается на время после ошибки квоты 456', async () => {
  let now = 1_000;
  const client = fakeClient({ fail: new QuotaExceededError('Quota exceeded') });
  const p = new DeepLProvider({ client, quotaCooldownMs: 60_000, now: () => now });
  await p.supports('ru');
  await assert.rejects(p.translate('hi', 'ru'), QuotaExceededError);
  assert.equal(p.isAvailable(), false);
  now += 60_001;
  assert.equal(p.isAvailable(), true);
});
