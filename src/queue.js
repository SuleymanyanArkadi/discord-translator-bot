/**
 * Последовательное выполнение задач с одинаковым ключом.
 * Нужна, чтобы несколько быстро поставленных флагов на одно сообщение
 * обрабатывались по очереди, а не наперегонки.
 */
export class KeyedQueue {
  #tails = new Map();

  run(key, task) {
    const prev = this.#tails.get(key) ?? Promise.resolve();
    const result = prev.then(() => task());
    const tail = result.catch(() => {});
    this.#tails.set(key, tail);
    tail.then(() => {
      if (this.#tails.get(key) === tail) this.#tails.delete(key);
    });
    return result;
  }

  get size() {
    return this.#tails.size;
  }
}
