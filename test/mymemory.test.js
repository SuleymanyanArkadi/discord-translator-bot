import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MyMemoryProvider, chunkByBytes } from '../src/translate/mymemory.js';

const reply = (body) => async () => ({ ok: true, json: async () => body });

test('MyMemory: перевод и исходный язык', async () => {
  let url;
  const fetchImpl = async (u) => {
    url = new URL(u);
    return { ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: 'Привет', detectedLanguage: 'en' } }) };
  };
  const r = await new MyMemoryProvider({ email: 'me@example.com', fetchImpl }).translate('Hello', 'ru');
  assert.deepEqual(r, { text: 'Привет', sourceLang: 'en' });
  assert.equal(url.searchParams.get('langpair'), 'autodetect|ru');
  assert.equal(url.searchParams.get('de'), 'me@example.com');
});

test('MyMemory: текст уже на целевом языке', async () => {
  const fetchImpl = reply({ responseStatus: 403, responseDetails: 'PLEASE SELECT TWO DISTINCT LANGUAGES', responseData: {} });
  const r = await new MyMemoryProvider({ fetchImpl }).translate('Привет', 'ru');
  assert.deepEqual(r, { text: 'Привет', sourceLang: 'ru' });
});

test('MyMemory: исчерпан лимит -> ошибка 429', async () => {
  const fetchImpl = reply({ responseStatus: 429, quotaFinished: true, responseData: { translatedText: 'MYMEMORY WARNING' } });
  await assert.rejects(new MyMemoryProvider({ fetchImpl }).translate('Hi', 'ru'), (e) => e.status === 429);
});

test('MyMemory: куски не больше 480 байт', () => {
  for (const text of ['Привет, мир. '.repeat(200), '你好世界。'.repeat(300), 'Hello. '.repeat(500)]) {
    const chunks = chunkByBytes(text);
    assert.equal(chunks.join(''), text);
    assert.ok(chunks.every((c) => Buffer.byteLength(c) <= 480));
  }
});
