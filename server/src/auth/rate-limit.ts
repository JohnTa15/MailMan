import { HttpException, HttpStatus } from '@nestjs/common';

/** Fixed-window attempt counter, in memory (the server runs as one process). */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Counts an attempt for `key`; throws 429 once the limit is passed. */
  hit(key: string): void {
    const now = Date.now();
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > this.limit) {
      const minutes = Math.ceil((entry.resetAt - now) / 60_000);
      throw new HttpException(`Too many attempts. Try again in ${minutes} min.`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }
}
