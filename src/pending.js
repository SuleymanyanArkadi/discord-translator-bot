import { randomBytes } from 'node:crypto';
import { log } from './logger.js';

/**
 * Временное хранилище готовых переводов для кнопок «Показать перевод».
 * Живёт только в памяти: после перезапуска бота кнопки становятся «устаревшими».
 */
export class PendingStore {
  #entries = new Map();

  /** Сохраняет данные и возвращает короткий id для customId кнопки. */
  create(data) {
    let id;
    do id = randomBytes(6).toString('hex');
    while (this.#entries.has(id));
    this.#entries.set(id, { ...data, id, createdAt: Date.now(), timer: null, message: null });
    return id;
  }

  get(id) {
    return this.#entries.get(id) ?? null;
  }

  /**
   * Привязывает отправленное сообщение с кнопкой и запускает таймер.
   * По истечении запись удаляется, а onExpire(entry) вызывается (ошибки ловятся).
   */
  attach(id, { message, timeoutMs, onExpire }) {
    const entry = this.#entries.get(id);
    if (!entry) return false;
    entry.message = message ?? null;
    clearTimeout(entry.timer);
    entry.timer = setTimeout(async () => {
      if (this.#entries.get(id) !== entry) return;
      this.#entries.delete(id);
      try {
        await onExpire?.(entry);
      } catch (err) {
        log.warn(`Ошибка при истечении перевода ${id}:`, err.message);
      }
    }, timeoutMs);
    entry.timer.unref?.();
    return true;
  }

  /** Удаляет запись и снимает таймер. Возвращает удалённую запись или null. */
  take(id) {
    const entry = this.#entries.get(id);
    if (!entry) return null;
    clearTimeout(entry.timer);
    this.#entries.delete(id);
    return entry;
  }

  delete(id) {
    return this.take(id) !== null;
  }

  /** Снимает все таймеры и возвращает все записи (для корректного завершения). */
  drain() {
    const all = [...this.#entries.values()];
    for (const e of all) clearTimeout(e.timer);
    this.#entries.clear();
    return all;
  }

  get size() {
    return this.#entries.size;
  }
}

export const pending = new PendingStore();
