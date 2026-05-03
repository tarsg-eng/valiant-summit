type TickCallback = (elapsed: number, nextQuoteIn: number) => void;
type QuoteCallback = () => void;
type CompleteCallback = () => void;

class TimerManager {
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private quoteTimeout: ReturnType<typeof setTimeout> | null = null;
  private startedAt = 0;
  private totalDuration = 0;
  private nextQuoteAt = 0;
  private minIntervalMs = 120_000;
  private maxIntervalMs = 180_000;

  onTick: TickCallback = () => {};
  onQuoteFired: QuoteCallback = () => {};
  onComplete: CompleteCallback = () => {};

  start(durationSeconds: number, minIntervalMs: number, maxIntervalMs: number): void {
    this.stop();
    this.totalDuration = durationSeconds * 1000;
    this.minIntervalMs = minIntervalMs;
    this.maxIntervalMs = maxIntervalMs;
    this.startedAt = Date.now();
    this.scheduleNextQuote();

    this.tickInterval = setInterval(() => {
      const elapsed = Date.now() - this.startedAt;
      const nextQuoteIn = Math.max(0, this.nextQuoteAt - Date.now());
      this.onTick(elapsed, nextQuoteIn);
      if (elapsed >= this.totalDuration) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.quoteTimeout) {
      clearTimeout(this.quoteTimeout);
      this.quoteTimeout = null;
    }
  }

  private scheduleNextQuote(): void {
    const delay =
      this.minIntervalMs +
      Math.random() * (this.maxIntervalMs - this.minIntervalMs);
    this.nextQuoteAt = Date.now() + delay;

    this.quoteTimeout = setTimeout(() => {
      const elapsed = Date.now() - this.startedAt;
      if (elapsed < this.totalDuration) {
        this.onQuoteFired();
        this.scheduleNextQuote();
      }
    }, delay);
  }
}

export default new TimerManager();
