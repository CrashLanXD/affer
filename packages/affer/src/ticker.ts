export interface TickData {
  /** Time elapsed since last frame in milliseconds */
  readonly deltaTime:   number;
  /** Total elapsed time since the Ticker started in milliseconds */
  readonly elapsedTime: number;
  /** processed frames */
  readonly frame:       number;
  /** Time elapsed in seconds */
  readonly time:        number;
  /** physics multiplier. 1 = 60fps, 0.5 = 120fps, 2 = 30fps */
  readonly deltaRatio:  number;
}

export type TickCallback = (data: TickData) => void;

interface ListenerMeta {
  callback: TickCallback;
  priority: number;
  once:     boolean;
  toRemove: boolean;
}

export interface TickerAddOptions {
  /** Higher priority listeners are executed first. Default: 0 */
  priority?: number;
  /** Whether the listener should be removed after its first execution. Default: false */
  once?:     boolean;
}

class TickerClass {

  private listeners = new Map<TickCallback, ListenerMeta>();
  private listenersArray: ListenerMeta[] = [];

  // private tickData: TickData = { deltaTime: 0, elapsedTime: 0, frame: 0, time: 0, deltaRatio: 1 };
  private tickData: {
    deltaTime:   number;
    elapsedTime: number;
    frame:       number;
    time:        number;
    deltaRatio:  number;
  } = { deltaTime: 0, elapsedTime: 0, frame: 0, time: 0, deltaRatio: 1 };

  private rafId: number | null = null;
  private lastTime = 0;
  private elapsedTime = 0;

  private isRunning = false;
  private _paused = false;

  private _targetFps = 0;
  private _frameDuration = 0;
  private _nextExecutionTime = 0;

  private _lagThreshold = 500;
  private _adjustedLag = 33;

  constructor() { this.tick = this.tick.bind(this); }

  /**
   * Adds a listener to the central update cycle.
   * Automatically starts the execution loop if it was inactive and not manually paused.
   * @returns A dispose function to unregister the listener.
   */
  public add(callback: TickCallback, options?: TickerAddOptions): () => void {
    const priority = options?.priority ?? 0;
    const once = options?.once ?? false;

    if (this.listeners.has(callback)) {
      const existing = this.listeners.get(callback)!;
      existing.priority = priority;
      existing.once = once;
      existing.toRemove = false;
    } else this.listeners.set(callback, { callback, priority, once, toRemove: false });

    this.rebuildListenersArray();
    if (!this.isRunning && !this._paused) this.start();

    return () => this.remove(callback);
  }

  /**
   * Registers a listener that will execute exactly once during the next frame step.
   * @returns A dispose function to unregister the listener before execution.
   */
  public once(callback: TickCallback, priority = 0): () => void { // Syntactic sugar
    return this.add(callback, { priority, once: true });
  }

  /**
   * Removes a callback from the central frame loop.
   * Automatically stops the loop if no listeners remain.
   */
  public remove(callback: TickCallback): void {
    if (this.listeners.delete(callback)) this.rebuildListenersArray();
    if (this.listeners.size === 0 && this.isRunning) this.stop();
  }

  /**
   * Sets the target frame rate for the Ticker. Setting this to 0 will disable the limit.
   */
  public fps(targetFps: number = 60): void {
    this._targetFps = targetFps;
    this._frameDuration = targetFps > 0 ? 1000 / targetFps : 0;
  }

  /**
   * Adjusts maximum allowed frame jumps to prevent timing spikes during heavy processor lag.
   * @param threshold Milliseconds of lag before adjusting the physics multiplier. 0 to disable.
   * @param adjustedLag The value (ms) to which the deltaTime will be reduced if threshold is exceeded.
   */
  public lagSmoothing(threshold: number = 500, adjustedLag = 33): void {
    this._lagThreshold = threshold === 0 ? Infinity : threshold;
    this._adjustedLag = Math.min(adjustedLag, this._lagThreshold);
  }

  private rebuildListenersArray(): void { // descending order
    this.listenersArray = Array.from(this.listeners.values()).sort((a, b) => b.priority - a.priority);
  }

  private start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this._nextExecutionTime = this.lastTime + this._frameDuration;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Suspend the ticker temporarily while maintaining the time state.
   */
  public pause(): void {
    if (!this._paused) {
      this._paused = true;
      this.isRunning = false;
      if (this.rafId !== null) { 
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }
  }

  /**
   * Resume the ticker preserving accumulated time and frames.
   */
  public resume(): void {
    if (this._paused) {
      this._paused = false;
      this.lastTime = performance.now();
      if (this.listeners.size > 0) this.start();
    }
  }

  private tick(now: number): void {
    if (!this.isRunning) return;

    if (this._targetFps > 0 && now < this._nextExecutionTime) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    let deltaTime = now - this.lastTime;

    if (deltaTime > this._lagThreshold) {
      this.lastTime += deltaTime - this._adjustedLag;
      deltaTime = this._adjustedLag;
    }
    
    this.lastTime = now;

    if (this._targetFps > 0) this._nextExecutionTime = now + (this._frameDuration - (deltaTime % this._frameDuration));

    this.elapsedTime += deltaTime;
    this.tickData.deltaTime = deltaTime;
    this.tickData.elapsedTime = this.elapsedTime;
    this.tickData.time = this.elapsedTime / 1000;
    this.tickData.frame++;
    this.tickData.deltaRatio = deltaTime * 0.06; // assume 60fps as base

    let needsCleanup = false;
    const len = this.listenersArray.length;
    for (let i = 0; i < len; i++) {
      const listener = this.listenersArray[i];
      if (listener.toRemove) continue;

      try {
        listener.callback(this.tickData);
      } catch (err) {
        console.error("Affer Ticker Callback Error:", err);
      }

      if (listener.once) {
        listener.toRemove = true;
        needsCleanup = true;
      }
    }

    if (needsCleanup) this.cleanupOnceListeners();
    if (this.isRunning) this.rafId = requestAnimationFrame(this.tick);
  }

  private cleanupOnceListeners(): void {
    let mutated = false;
    const len = this.listenersArray.length;
    for (let i = 0; i < len; i++) {
      const listener = this.listenersArray[i];
      if (listener.toRemove) (this.listeners.delete(listener.callback), mutated = true);
    }

    if (mutated) {
      this.rebuildListenersArray();
      if (this.listeners.size === 0 && this.isRunning) this.stop();
    }
  }

  public get isActive(): boolean { return this.isRunning;}
  public get isPaused(): boolean { return this._paused; }
  public get time(): number { return this.tickData.time; }
  public get frame(): number { return this.tickData.frame; }
  public get listenerCount(): number { return this.listeners.size; }

  /**
   * Development helper to monitor internal engine metrics.
   */
  public get stats() {
    const currentFps = this.tickData.deltaTime > 0 ? Math.round(1000 / this.tickData.deltaTime) : 0;
    return {
      fps:           currentFps,
      targetFps:     this._targetFps > 0 ? this._targetFps : "Unlimited",
      listenerCount: this.listeners.size,
      frame:         this.tickData.frame,
      timeSeconds:   Number(this.tickData.time.toFixed(2)),
      deltaRatio:    Number(this.tickData.deltaRatio.toFixed(3)),
      status:        this._paused ? "Paused" : (this.isRunning ? "Running" : "Stopped"),
    };
  }

}

export const Ticker = /* @__PURE__ */ new TickerClass();
export default Ticker;
