/** Простой LRU-кэш на Map (порядок вставки = порядок использования). */
export class LRUCache {
  #map = new Map();

  constructor(maxSize = 1000) {
    if (!(maxSize > 0)) throw new RangeError('maxSize должен быть > 0');
    this.maxSize = maxSize;
  }

  get(key) {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key);
    this.#map.delete(key);
    this.#map.set(key, value);
    return value;
  }

  has(key) {
    return this.#map.has(key);
  }

  set(key, value) {
    if (this.#map.has(key)) this.#map.delete(key);
    this.#map.set(key, value);
    while (this.#map.size > this.maxSize) {
      this.#map.delete(this.#map.keys().next().value);
    }
    return this;
  }

  delete(key) {
    return this.#map.delete(key);
  }

  clear() {
    this.#map.clear();
  }

  get size() {
    return this.#map.size;
  }
}
