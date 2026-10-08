import { config } from './config.js';

/** Скользящее окно: не больше `limit` событий за `windowMs` на ключ. */
export class RateLimiter {
  #hits = new Map();

  constructor({ limit, windowMs, now = Date.now }) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Регистрирует попытку. true — разрешено, false — лимит превышен. */
  hit(key) {
    const now = this.now();
    const recent = (this.#hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (recent.length >= this.limit) {
      this.#hits.set(key, recent);
      return false;
    }
    recent.push(now);
    this.#hits.set(key, recent);
    if (this.#hits.size > 10_000) this.#prune(now);
    return true;
  }

  #prune(now) {
    for (const [key, times] of this.#hits) {
      if (times.every((t) => now - t >= this.windowMs)) this.#hits.delete(key);
    }
  }
}

/** Общий лимит переводов на пользователя (реакции + /translate). */
export const rateLimiter = new RateLimiter(config.rateLimit);
