import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VitaletsProvider } from '../src/translate/vitalets.js';

test('VitaletsProvider: перевод и определение исходного языка', async () => {
  const calls = [];
  const translateFn = async (text, opts) => {
    calls.push(opts.to);
    return { text: `[${opts.to}] ${text}`, raw: { src: 'iw' } };
  };
  const r = await new VitaletsProvider({ translateFn }).translate('שלום', 'ru');
  assert.deepEqual(r, { text: '[ru] שלום', sourceLang: 'he' });
  assert.deepEqual(calls, ['ru']);
});

test('VitaletsProvider: длинный текст режется на куски и склеивается', async () => {
  let n = 0;
  const translateFn = async (text) => {
    n++;
    return { text, raw: { src: 'en' } };
  };
  const long = 'Word. '.repeat(2000); // 12000 символов
  const r = await new VitaletsProvider({ translateFn }).translate(long, 'de');
  assert.equal(r.text, long);
  assert.ok(n >= 3);
});

test('VitaletsProvider: ошибка 429 пробрасывается для фолбэка', async () => {
  const translateFn = async () => {
    throw Object.assign(new Error('Too Many Requests'), { status: 429 });
  };
  await assert.rejects(new VitaletsProvider({ translateFn }).translate('hi', 'ru'), /Too Many Requests/);
});
