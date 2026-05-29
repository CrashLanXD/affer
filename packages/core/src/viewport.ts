import { debounce, throttle } from './utils';

export interface ViewportData {
  /** Viewport width in CSS pixels */
  width: number;
  /** Viewport height in CSS pixels */
  height: number;
  /** Viewport aspect ratio (width / height) */
  aspect: number;
  /** Screen device pixel ratio (for high-DPI scaling) */
  dpr: number;
}

export interface ViewportTrackerOptions {
  /** Debounce delay in milliseconds. Default 150 */
  debounceDelay?: number;
  /** Throttle limit in milliseconds. Default 100 */
  throttleLimit?: number;
  /** Resize event listener pacing mode: 'debounce' | 'throttle' | 'none'. Default 'debounce' */
  mode?: 'debounce' | 'throttle' | 'none';
  /** Initial callback when resize completes */
  onResize?: (data: ViewportData) => void;
}

export class ViewportTracker {
  /** Current viewport width in CSS pixels */
  public width = 0;
  /** Current viewport height in CSS pixels */
  public height = 0;
  /** Current aspect ratio (width / height) */
  public aspect = 0;
  /** Screen device pixel ratio */
  public dpr = 1;

  private listeners = new Set<(data: ViewportData) => void>();
  private resizeHandler!: () => void;
  private mediaQueryCleanups = new Set<() => void>();


  constructor(options: ViewportTrackerOptions = {}) {
    const delay = options.debounceDelay ?? 150;
    const limit = options.throttleLimit ?? 100;
    const mode = options.mode ?? 'debounce';

    this.updateData = this.updateData.bind(this);

    // Initialize dimensions
    this.updateData();

    if (options.onResize) {
      this.listeners.add(options.onResize);
    }

    this.setupHandler(mode, delay, limit);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeHandler, { passive: true });
    }
  }

  private setupHandler(mode: 'debounce' | 'throttle' | 'none', delay: number, limit: number): void {
    if (mode === 'debounce') {
      this.resizeHandler = debounce(this.updateData, delay);
    } else if (mode === 'throttle') {
      this.resizeHandler = throttle(this.updateData, limit);
    } else {
      this.resizeHandler = this.updateData;
    }
  }

  private updateData(): void {
    if (typeof window === 'undefined') return;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspect = this.width / (this.height || 1);
    this.dpr = window.devicePixelRatio || 1;

    const data = this.getData();
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (err) {
        console.error('Zyphora Viewport Tracker Callback Error:', err);
      }
    }
  }

  /**
   * Retrieves the current viewport state snapshot.
   */
  public getData(): ViewportData {
    return {
      width: this.width,
      height: this.height,
      aspect: this.aspect,
      dpr: this.dpr,
    };
  }

  /**
   * Registers a resize listener callback. Immediately fires once with current data.
   */
  public addListener(callback: (data: ViewportData) => void): void {
    this.listeners.add(callback);
    callback(this.getData());
  }

  /**
   * Unregisters a resize listener callback.
   */
  public removeListener(callback: (data: ViewportData) => void): void {
    this.listeners.delete(callback);
  }

  /**
   * Scales a canvas element's hardware pixel grid for sharp rendering on high-DPI screens.
   * Resizes its drawing buffer to match its CSS dimensions multiplied by the screen's devicePixelRatio.
   * Optionally resets and returns a scaled 2D context.
   *
   * @param canvas The target canvas element.
   * @param customWidth Optional display width in CSS pixels. Defaults to window.innerWidth.
   * @param customHeight Optional display height in CSS pixels. Defaults to window.innerHeight.
   */
  public resizeCanvas(
    canvas: HTMLCanvasElement,
    customWidth?: number,
    customHeight?: number
  ): { width: number; height: number; dpr: number } {
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const displayWidth = customWidth ?? this.width;
    const displayHeight = customHeight ?? this.height;

    // Set display style in CSS pixels
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    // Set drawing buffer resolution in physical device pixels
    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);

    return {
      width: displayWidth,
      height: displayHeight,
      dpr,
    };
  }

  /**
   * Registers a media query listener. Automatically updates state and cleans up on destruction.
   * Returns a function to unbind the listener manually.
   */
  public matchMedia(query: string, callback: (matches: boolean) => void): () => void {
    if (typeof window === 'undefined') {
      callback(false);
      return () => {};
    }

    const mediaQueryList = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent | MediaQueryList) => callback(e.matches);

    // Call immediately with current state
    callback(mediaQueryList.matches);

    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', handler);
    } else {
      (mediaQueryList as any).addListener(handler);
    }

    const cleanup = () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', handler);
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

  /**
   * Cleans up resize listeners, active media queries, and clears active callbacks.
   */
  public destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler);
    }
    this.listeners.clear();
    for (const cleanup of this.mediaQueryCleanups) {
      cleanup();
    }
    this.mediaQueryCleanups.clear();
  }
}

export default ViewportTracker;
