export interface TickData {
  /** Time elapsed since last frame in milliseconds */
  deltaTime: number;
  /** Total elapsed time since the Ticker started in milliseconds */
  elapsedTime: number;
}

export type TickCallback = (data: TickData) => void;

class TickerClass {
  private listeners = new Set<TickCallback>();
  private listenersArray: TickCallback[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsedTime = 0;
  private isRunning = false;

  constructor() {
    this.tick = this.tick.bind(this);
  }

  /**
   * Adds a callback to the central frame loop.
   * Automatically starts the loop if it wasn't running.
   */
  public add(callback: TickCallback): void {
    if (this.listeners.has(callback)) return;
    this.listeners.add(callback);
    this.listenersArray = Array.from(this.listeners);

    if (!this.isRunning) this.start();
  }

  /**
   * Removes a callback from the central frame loop.
   * Automatically stops the loop if no listeners remain.
   */
  public remove(callback: TickCallback): void {
    if (this.listeners.delete(callback)) this.listenersArray = Array.from(this.listeners);
    if (this.listeners.size === 0 && this.isRunning) this.stop();
  }

  private start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(now: number): void {
    if (!this.isRunning) return;

    // Calculate time elapsed
    let deltaTime = now - this.lastTime;
    // Guard against massive jumps (e.g. background tab resuming)
    // Fallback to 1 frame (~60fps) to prevent crazy jumps in lerp
    if (deltaTime > 100) deltaTime = 16.67;
    
    this.lastTime = now;
    this.elapsedTime += deltaTime;

    const data: TickData = { deltaTime, elapsedTime: this.elapsedTime };

    const len = this.listenersArray.length;
    for (let i = 0; i < len; i++) {
      try {
        this.listenersArray[i](data);
      } catch (err) {
        console.error('Zyphora Ticker Callback Error:', err);
      }
    }

    if (this.isRunning) this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Returns whether the requestAnimationFrame loop is active.
   */
  public get isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Returns the number of registered callbacks.
   */
  public get listenerCount(): number {
    return this.listeners.size;
  }
}

export const Ticker = new TickerClass();
export default Ticker;
