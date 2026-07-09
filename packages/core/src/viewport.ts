import { debounce, throttle } from "./utils";

/**
 * TODO:
 * - window.visualViewport
 * - isPortrait: boolean;
 * - orientation: "portrait" | "landscape";
 * - visualWidth: number;
 * - visualHeight: number;
 * 
 * if (window.visualViewport) window.visualViewport.addEventListener("resize", this.resizeHandler, { passive: true });
 */

export interface ViewportData {
  readonly width:  number;
  readonly height: number;
  readonly aspect: number;
  readonly dpr:    number;
}

export interface ViewportConfig {
  /** Debounce delay in milliseconds. Default 150 */
  debounceDelay?: number;
  /** Throttle limit in milliseconds. Default 100 */
  throttleLimit?: number;
  /** * "sync": Aligns with screen refresh rate (1 rAF)
   * "debounce": Waits for resize to finish
   * "throttle": Limits updates to a fixed interval
   */
  mode?:          "sync" | "debounce" | "throttle";
}

export class ViewportClass {

  private data: { width: number; height: number; aspect: number; dpr: number } = {
    width:  0,
    height: 0,
    aspect: 0,
    dpr:    1,
  };

  private listeners = new Set<(data: ViewportData) => void>();
  private listenersArray: ((data: ViewportData) => void)[] = [];  
  private mediaQueryCleanups = new Set<() => void>();
  private dprCleanup:     (() => void) | null = null;
  private resizeHandler!: () => void;

  private currentMode: "sync" | "debounce" | "throttle" = "sync";
  private currentDelay = 150;
  private currentLimit = 100;

  private isUpdateScheduled = false;

  constructor() {
    if (typeof window === "undefined") return;

    this.executeDataUpdate = this.executeDataUpdate.bind(this);
    this.syncHandler = this.syncHandler.bind(this);

    this.executeDataUpdate();
    this.setupHandler("sync", this.currentDelay, this.currentLimit);
    this.setupDprWatcher();

    window.addEventListener("resize", this.resizeHandler, { passive: true });
  }

  /**
   * Allows to reconfigure the viewport tracker pacing.
   * [!note]: Not intended to be used frequently.
   * For WebGL/Canvas it is recommended to keep "sync" mode.
   */
  public configure(options: ViewportConfig): void {
    if (typeof window === "undefined") return;

    const newMode = options.mode ?? "sync";
    const newDelay = options.debounceDelay ?? this.currentDelay;
    const newLimit = options.throttleLimit ?? this.currentLimit;

    /** TODO: possible executeDataUpdate ghost
     * resizeHandler.cancel();
     * if the mode change in the middle of a resize (e.g. from debounce to sync)
     * the original debounce method may still have a pending setTimeout
     */
    if (newMode !== this.currentMode || newDelay !== this.currentDelay || newLimit !== this.currentLimit) {
      window.removeEventListener("resize", this.resizeHandler);
      this.setupHandler(newMode, newDelay, newLimit);
      window.addEventListener("resize", this.resizeHandler, { passive: true });
    }
  }

  private setupHandler(mode: "sync" | "debounce" | "throttle", delay: number, limit: number): void {
    this.currentMode = mode;
    this.currentDelay = delay;
    this.currentLimit = limit;
    if      (mode === "debounce") this.resizeHandler = debounce(this.executeDataUpdate, delay);
    else if (mode === "throttle") this.resizeHandler = throttle(this.executeDataUpdate, limit);
    else                          this.resizeHandler = this.syncHandler;
  }

  private syncHandler(): void {
    if (!this.isUpdateScheduled) {
      this.isUpdateScheduled = true;
      requestAnimationFrame(this.executeDataUpdate);
    }
  }

  private executeDataUpdate(): void {
    if (typeof window === "undefined") return;

    this.isUpdateScheduled = false;

    this.data.width = window.innerWidth;
    this.data.height = window.innerHeight;
    this.data.aspect = this.data.width / (this.data.height || 1);
    this.data.dpr = window.devicePixelRatio || 1;

    const len = this.listenersArray.length;
    for (let i = 0; i < len; i++) {
      try {
        this.listenersArray[i](this.data);
      } catch (err) {
        console.error("Affer Viewport Service Callback Error:", err);
      }
    }
  }

  /**
   * Detects when the user moves the window to a screen with a different DPR.
   * Which natively doesn't fire a 'resize' event.
   */
  private setupDprWatcher(): void {
    if (typeof window === "undefined") return;
    if (this.dprCleanup) this.dprCleanup();

    const mq = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
    const handler = () => {
      const newDpr = window.devicePixelRatio || 1;
      if (newDpr !== this.data.dpr) {
        this.executeDataUpdate();
        this.setupDprWatcher();
      }
    };

    if(mq.addEventListener) {
      mq.addEventListener("change", handler, { once: true });
      this.dprCleanup = () => mq.removeEventListener("change", handler);
    } else {
      (mq as any).addListener(handler);
      this.dprCleanup = () => (mq as any).removeListener(handler);
    }
  }

  public get width() { return this.data.width; }
  public get height() { return this.data.height; }
  public get aspect() { return this.data.aspect; }
  public get dpr() { return this.data.dpr; }

  /** Retrieves a read-only snapshot of the current viewport state */
  public get state(): ViewportData { return this.data; }

  /**
   * Registers a resize listener callback. Immediately fires once with current data.
   */
  public addListener(callback: (data: ViewportData) => void): void {
    if (this.listeners.has(callback)) return;
    this.listeners.add(callback);
    this.listenersArray = Array.from(this.listeners);
    callback(this.data);
  }

  /**
   * Unregisters a resize listener callback.
   */
  public removeListener(callback: (data: ViewportData) => void): void {
    if (this.listeners.delete(callback)) this.listenersArray = Array.from(this.listeners);
  }

  /**
   * Scales a canvas element"s hardware pixel grid for sharp rendering on high-DPI screens.
   * Resizes its drawing buffer to match its CSS dimensions multiplied by the screen"s devicePixelRatio.
   * Optionally resets and returns a scaled 2D context.
   *
   * @param canvas The target canvas element.
   * @param customWidth Optional display width in CSS pixels. Defaults to window.innerWidth.
   * @param customHeight Optional display height in CSS pixels. Defaults to window.innerHeight.
   */
  public resizeCanvas(
    canvas: HTMLCanvasElement,
    customWidth?: number,
    customHeight?: number,
  ): { width: number; height: number; dpr: number } {
    const displayWidth = customWidth ?? this.width;
    const displayHeight = customHeight ?? this.height;

    // Set display style in CSS pixels
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Set drawing buffer resolution in physical device pixels
    canvas.width = Math.round(displayWidth * this.dpr);
    canvas.height = Math.round(displayHeight * this.dpr);

    return { width: displayWidth, height: displayHeight, dpr: this.dpr };
  }

  /**
   * Automatically synchronizes a canvas size with the Viewport.
   * Useful for canvas context to maintain sharp resolution natively.
   * @returns A cleanup function to unregister the listener.
   */
  public autoResizeCanvas(
    canvas: HTMLCanvasElement,
    onResize?: (dims: { width: number; height: number; dpr: number }) => void,
  ): () => void {
    const handler = () => {
      const dims = this.resizeCanvas(canvas);
      onResize?.(dims);
    };
    this.addListener(handler);
    return () => this.removeListener(handler);
  }

  /**
   * Registers a media query listener. Automatically updates state and cleans up on destruction.
   * Returns a function to unbind the listener manually.
   */
  public matchMedia(query: string, callback: (matches: boolean) => void): () => void {
    if (typeof window === "undefined") {
      callback(false);
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => callback(e.matches);

    // Call immediately with current state
    callback(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", handler);
    } else {
      (mediaQueryList as any).addListener(handler);
    }

    const cleanup = () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", handler);
      } else {
        (mediaQueryList as any).removeListener(handler);
      }
    };

    this.mediaQueryCleanups.add(cleanup);

    return () => {
      cleanup();
      this.mediaQueryCleanups.delete(cleanup);
    };
  }

  public destroy(): void {
    if (typeof window !== "undefined") window.removeEventListener("resize", this.resizeHandler);
    if (this.dprCleanup) (this.dprCleanup(), this.dprCleanup = null);
    this.mediaQueryCleanups.forEach(fn => fn());
    this.mediaQueryCleanups.clear();
    this.listeners.clear();
    this.listenersArray = [];
  }
  
}

export const Viewport = /* @__PURE__ */ new ViewportClass();
export default Viewport;
