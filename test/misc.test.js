import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PendingStore } from '../src/pending.js';
import { KeyedQueue } from '../src/queue.js';
import { RateLimiter } from '../src/ratelimit.js';
import { chunkText, truncate, TRUNCATION_NOTE } from '../src/utils.js';
import { resolveLanguage, searchLanguages, isSameLanguage } from '../src/languages.js';
import { buildReadyMessage, buildTranslationEmbed, composeParts, extractParts } from '../src/ui.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('RateLimiter: 10 в минуту на пользователя', () => {
  let now = 0;
  const rl = new RateLimiter({ limit: 10, windowMs: 60_000, now: () => now });
  for (let i = 0; i < 10; i++) assert.ok(rl.hit('u1'));
  assert.equal(rl.hit('u1'), false);
  assert.ok(rl.hit('u2')); // другой пользователь не затронут
  now = 60_000;
  assert.ok(rl.hit('u1')); // окно прошло
});

test('KeyedQueue выполняет задачи с одним ключом по очереди и переживает ошибки', async () => {
  const q = new KeyedQueue();
  const log = [];
  const task = (name, ms, fail) => async () => {
    log.push(`start ${name}`);
    await sleep(ms);
    log.push(`end ${name}`);
    if (fail) throw new Error(name);
  };
  const results = await Promise.allSettled([
    q.run('k', task('a', 20, true)),
    q.run('k', task('b', 5)),
    q.run('k', task('c', 1)),
  ]);
  assert.deepEqual(log, ['start a', 'end a', 'start b', 'end b', 'start c', 'end c']);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[2].status, 'fulfilled');
  await sleep(0);
  assert.equal(q.size, 0);
});

test('PendingStore: истечение удаляет запись и вызывает onExpire', async () => {
  const store = new PendingStore();
  const id = store.create({ userId: '1' });
  let expired = null;
  store.attach(id, { message: 'msg', timeoutMs: 10, onExpire: (e) => (expired = e) });
  await sleep(30);
  assert.equal(store.get(id), null);
  assert.equal(expired.message, 'msg');
});

test('PendingStore: take снимает таймер', async () => {
  const store = new PendingStore();
  const id = store.create({ userId: '1' });
  let called = false;
  store.attach(id, { timeoutMs: 10, onExpire: () => (called = true) });
  assert.equal(store.take(id).userId, '1');
  await sleep(30);
  assert.equal(called, false);
  assert.equal(store.take(id), null);
});

test('PendingStore: ошибка в onExpire не роняет процесс', async () => {
  const store = new PendingStore();
  const id = store.create({});
  store.attach(id, {
    timeoutMs: 5,
    onExpire: async () => {
      throw new Error('Unknown Message');
    },
  });
  await sleep(20);
  assert.equal(store.size, 0);
});

test('truncate соблюдает лимит 4096 и добавляет пометку', () => {
  const t = truncate('a'.repeat(5000));
  assert.equal(t.length, 4096);
  assert.ok(t.endsWith(TRUNCATION_NOTE));
  assert.equal(truncate('short'), 'short');
  const emoji = truncate('😀'.repeat(3000)); // не режем суррогатную пару
  assert.ok(emoji.length <= 4096);
  assert.ok(!/[\uD800-\uDBFF]$/.test(emoji.slice(0, -TRUNCATION_NOTE.length)));
});

test('chunkText режет без потерь', () => {
  const text = 'Строка один.\nСтрока два. Ещё предложение! '.repeat(100);
  const chunks = chunkText(text, 300);
  assert.ok(chunks.every((c) => c.length <= 300));
  assert.equal(chunks.join(''), text);
  assert.deepEqual(chunkText('x'.repeat(10), 4), ['xxxx', 'xxxx', 'xx']);
});

test('языки: поиск и разбор', () => {
  assert.equal(resolveLanguage('ru').code, 'ru');
  assert.equal(resolveLanguage('Русский (ru)').code, 'ru');
  assert.equal(resolveLanguage('немецкий').code, 'de');
  assert.equal(resolveLanguage('Deutsch').code, 'de');
  assert.equal(resolveLanguage('zh-cn').code, 'zh-CN');
  assert.equal(resolveLanguage('klingon'), null);
  assert.equal(searchLanguages('ру')[0].code, 'ru');
  assert.ok(searchLanguages('').length <= 25);
  assert.ok(isSameLanguage('en', 'en-US'));
  assert.ok(isSameLanguage('zh', 'zh-CN'));
  assert.ok(!isSameLanguage('en', 'ru'));
  assert.ok(!isSameLanguage(null, 'ru'));
});

test('UI: сообщение с кнопкой без пинга', () => {
  const msg = buildReadyMessage('123', '🇷🇺', 'abc');
  assert.equal(msg.content, '<@123>, перевод готов 🇷🇺');
  assert.deepEqual(msg.allowedMentions, { parse: [], repliedUser: false });
  const button = msg.components[0].toJSON().components[0];
  assert.equal(button.custom_id, 'tr:abc');
  assert.equal(button.label, 'Показать перевод');
});

test('UI: извлечение текста из сообщения и embed’ов', () => {
  const parts = extractParts({
    content: 'Hello',
    embeds: [{ title: 'Title', description: 'Desc' }, { title: null, description: '  ' }, { description: 'Only desc' }],
  });
  assert.deepEqual(parts.map((p) => p.kind), ['content', 'embedTitle', 'embedDescription', 'embedDescription']);
  assert.equal(composeParts(parts), 'Hello\n\n**Title**\nDesc\n\nOnly desc');
  assert.deepEqual(extractParts({ content: '', embeds: [] }), []); // только картинка/стикер
});

test('UI: embed перевода и пометка «уже на этом языке»', () => {
  const e = buildTranslationEmbed({
    text: 'x'.repeat(5000), sourceLang: 'en', targetLang: 'ru', provider: 'DeepL', sameLanguage: false,
    url: 'https://discord.com/channels/1/2/3', authorName: 'Bob',
  }).toJSON();
  assert.equal(e.description.length, 4096);
  assert.equal(e.title, '🇬🇧 English → 🇷🇺 Русский');
  assert.match(e.fields[0].value, /discord\.com\/channels/);
  const same = buildTranslationEmbed({ text: 'Привет', sourceLang: 'ru', targetLang: 'ru', provider: 'DeepL', sameLanguage: true }).toJSON();
  assert.match(same.description, /уже на языке/);
});

test('autocomplete: релевантность и популярность', () => {
  assert.equal(searchLanguages('')[0].code, 'en');
  assert.equal(searchLanguages('de')[0].code, 'de');
  assert.equal(searchLanguages('арм')[0].code, 'hy');
  assert.equal(searchLanguages('zh').length, 2);
  assert.equal(searchLanguages('qqq').length, 0);
});
