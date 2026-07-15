import { debounce, rafThrottle, throttle } from "./utils";

/**
 * TODO:
 * - visualViewport.scroll (offsetTop/offsetLeft) for on-screen-keyboard-aware
 *   positioning - not implemented yet, only .resize is tracked so far.
 *
 * RESOLVED:
 * - window.visualViewport tracking (visualWidth/visualHeight)
 * - isPortrait / orientation
 */

export interface ViewportData {
  readonly width:        number;
  readonly height:       number;
  readonly aspect:       number;
  readonly dpr:          number;
  /** window.visualViewport dimensions - reflects pinch-zoom and, on some
   *  browsers, the on-screen keyboard. Falls back to width/height when
   *  visualViewport isn't supported (older desktop Safari). */
  readonly visualWidth:  number;
  readonly visualHeight: number;
  /** True if the viewport height is greater or equal to its width */
  readonly isPortrait:   boolean;
  /**
   * Viewport orientation based on current window dimensions.
   * Note: Unlike screen.orientation, this reflects the browser window's aspect ratio,
   */
  readonly orientation:  "portrait" | "landscape";
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

  private data: {
    width:        number;
    height:       number;
    aspect:       number;
    dpr:          number;
    visualWidth:  number;
    visualHeight: number;
    isPortrait:   boolean;
    orientation:  "portrait" | "landscape";
  } = {
    width:        0,
    height:       0,
    aspect:       0,
    dpr:          1,
    visualWidth:  0,
    visualHeight: 0,
    isPortrait:   false,
    orientation:  "landscape",
  };

  private listeners = new Set<(data: ViewportData) => void>();
  private listenersArray: ((data: ViewportData) => void)[] = [];  
  private mediaQueryCleanups = new Set<() => void>();
  private dprCleanup:     (() => void) | null = null;
  private resizeHandler!: (() => void) & { cancel: () => void };

  private currentMode: "sync" | "debounce" | "throttle" = "sync";
  private currentDelay = 150;
  private currentLimit = 100;

  constructor() {
    if (typeof window === "undefined") return;

    this.executeDataUpdate = this.executeDataUpdate.bind(this);

    this.executeDataUpdate();
    this.setupHandler("sync", this.currentDelay, this.currentLimit);
    this.setupDprWatcher();

    this.attachResizeListeners();
  }

  /**
   * Allows to reconfigure the viewport tracker pacing.
   * Returns the instance for chainability.
   */
  public configure(options: ViewportConfig): this {
    if (typeof window === "undefined") return this;

    const newMode = options.mode ?? "sync";
    const newDelay = options.debounceDelay ?? this.currentDelay;
    const newLimit = options.throttleLimit ?? this.currentLimit;

    if (newMode !== this.currentMode || newDelay !== this.currentDelay || newLimit !== this.currentLimit) {
      this.detachResizeListeners();
      this.setupHandler(newMode, newDelay, newLimit);
      this.attachResizeListeners();
    }

    return this;
  }

  private setupHandler(mode: "sync" | "debounce" | "throttle", delay: number, limit: number): void {
    if (this.resizeHandler) this.resizeHandler.cancel();

    this.currentMode = mode;
    this.currentDelay = delay;
    this.currentLimit = limit;

    if      (mode === "debounce") this.resizeHandler = debounce(this.executeDataUpdate, delay);
    else if (mode === "throttle") this.resizeHandler = throttle(this.executeDataUpdate, limit);
    else                          this.resizeHandler = rafThrottle(this.executeDataUpdate);
  }

  /**
   * Attaches both `window.resize` and `visualViewport.resize` (when supported)
   * to the SAME `resizeHandler` reference, so pinch-zoom / keyboard-driven
   * visual viewport changes respect the same pacing mode as regular resizes.
   */
  private attachResizeListeners(): void {
    window.addEventListener("resize", this.resizeHandler, { passive: true });
    window.visualViewport?.addEventListener("resize", this.resizeHandler, { passive: true });
  }

  /**
   * Must be called with the SAME resizeHandler reference that was attached -
   * always pair with attachResizeListeners(), never call detach after
   * resizeHandler has already been reassigned by setupHandler().
   */
  private detachResizeListeners(): void {
    window.removeEventListener("resize", this.resizeHandler);
    window.visualViewport?.removeEventListener("resize", this.resizeHandler);
  }

  private getOrientation(): "portrait" | "landscape" {
    return this.data.height >= this.data.width ? "portrait" : "landscape";
  }

  private executeDataUpdate(): void {
    if (typeof window === "undefined") return;

    this.data.width = window.innerWidth;
    this.data.height = window.innerHeight;
    this.data.aspect = this.data.width / (this.data.height || 1);
    this.data.dpr = window.devicePixelRatio || 1;

    this.data.visualWidth = window.visualViewport?.width ?? this.data.width;
    this.data.visualHeight = window.visualViewport?.height ?? this.data.height;

    this.data.orientation = this.getOrientation();
    this.data.isPortrait = this.data.orientation === "portrait";

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

    const safeDpr = Math.round(this.dpr * 1000) / 1000;
    const mq = window.matchMedia(`(resolution: ${safeDpr}dppx)`);
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
  public get visualWidth() { return this.data.visualWidth; }
  public get visualHeight() { return this.data.visualHeight; }
  public get isPortrait() { return this.data.isPortrait; }
  public get orientation() { return this.data.orientation; }

  /** Retrieves a read-only live snapshot of the current viewport state */
  public get state(): ViewportData { return this.data; }

  /**
   * Registers a resize listener callback. Immediately fires once with current data.
   * @returns A dispose function to easily unregister the listener.
   */
  public addListener(callback: (data: ViewportData) => void): () => void {
    if (!this.listeners.has(callback)) {
      this.listeners.add(callback);
      this.listenersArray = Array.from(this.listeners);
    }
    callback(this.data);
    return () => this.removeListener(callback);
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
  ): Readonly<{ width: number; height: number; dpr: number }> {
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
   * @returns A function to unbind the listener manually.
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
    if (typeof window !== "undefined") this.detachResizeListeners();
    if (this.resizeHandler) this.resizeHandler.cancel();
    if (this.dprCleanup) (this.dprCleanup(), this.dprCleanup = null);
    this.mediaQueryCleanups.forEach(fn => fn());
    this.mediaQueryCleanups.clear();
    this.listeners.clear();
    this.listenersArray = [];
  }
  
}

export const Viewport = /* @__PURE__ */ new ViewportClass();
export default Viewport;
