import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from '../src/translate/lru.js';
import { cacheKey } from '../src/translate/index.js';

test('LRU вытесняет самый давно использованный элемент', () => {
  const c = new LRUCache(2);
  c.set('a', 1).set('b', 2);
  assert.equal(c.get('a'), 1); // a стал свежим
  c.set('c', 3); // вытесняется b
  assert.equal(c.has('b'), false);
  assert.equal(c.get('a'), 1);
  assert.equal(c.get('c'), 3);
  assert.equal(c.size, 2);
});

test('LRU: перезапись ключа обновляет значение и позицию', () => {
  const c = new LRUCache(2);
  c.set('a', 1).set('b', 2).set('a', 10).set('c', 3);
  assert.equal(c.get('a'), 10);
  assert.equal(c.has('b'), false);
});

test('LRU: get отсутствующего ключа -> undefined', () => {
  assert.equal(new LRUCache(1).get('nope'), undefined);
});

test('LRU: некорректный размер', () => {
  assert.throws(() => new LRUCache(0), RangeError);
});

test('ключ кэша: хэш текста + язык', () => {
  assert.equal(cacheKey('hi', 'ru'), cacheKey('hi', 'ru'));
  assert.notEqual(cacheKey('hi', 'ru'), cacheKey('hi', 'de'));
  assert.notEqual(cacheKey('hi', 'ru'), cacheKey('hi!', 'ru'));
  assert.match(cacheKey('hi', 'ru'), /^[0-9a-f]{40}:ru$/);
});
