import Ticker, { type TickCallback, type TickData } from "./ticker";
import Viewport from "./viewport";
import { clamp, lerpContextual } from "./utils";

export interface ScrollTrackerOptions {
  /** Optional callback fired when scrolling occurs */
  onScroll?:       (tracker: ScrollTracker, event: Event | null) => void;
  /** Interpolation factor for smooth coordinates. Default 10 */
  lerpFactor?:     number;
  /** Disables auto-registration of the Affer Ticker */
  externalTicker?: boolean;
}

export class ScrollTracker {

  public scrollX = 0;
  public scrollY = 0;
  public maxScrollX = 0;
  public maxScrollY = 0;
  public progressX = 0;
  public progressY = 0;

  public lerpScrollX = 0;
  public lerpScrollY = 0;
  public lerpProgressX = 0;
  public lerpProgressY = 0;

  public velocityX = 0;
  public velocityY = 0;

  public isDestroyed = false;

  private lerpFactor:        number;
  private onScrollCallback?: (tracker: ScrollTracker, event: Event | null) => void;
  private prevScrollX = 0;
  private prevScrollY = 0;

  private hasScrolledThisFrame = false;
  private _lastScrollEvent: Event | null = null;

  private _lastExternalTick = 0;
  private _externalTicker: boolean;
  private _tickerCallback: TickCallback | null = null;

  constructor(options: ScrollTrackerOptions = {}) {
    this.lerpFactor = options.lerpFactor ?? 10;
    this.onScrollCallback = options.onScroll;
    this._externalTicker = options.externalTicker ?? false;

    this.update = this.update.bind(this);
    this.updateLimits = this.updateLimits.bind(this);

    if (typeof window !== "undefined") {
      this.scrollX = window.scrollX ?? window.pageXOffset ?? 0;
      this.scrollY = window.scrollY ?? window.pageYOffset ?? 0;

      this.prevScrollX = this.scrollX;
      this.prevScrollY = this.scrollY;
      this.lerpScrollX = this.scrollX;
      this.lerpScrollY = this.scrollY;

      this.updateLimits();
      this.updateProgress();
    }

    this.initListeners();
    if (!this._externalTicker) {
      this._tickerCallback = (data: TickData) => this.update(data.deltaTime);
      Ticker.add(this._tickerCallback);
    }
  }

  private initListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    Viewport.addListener(this.updateLimits);
  }

  private removeListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("scroll", this.handleScroll);
    Viewport.removeListener(this.updateLimits);
  }

  public updateLimits(): void {
    if (typeof document === "undefined" || typeof window === "undefined" || !document.body) return;
    const docEl = document.documentElement, body = document.body;
    const dsw = docEl.scrollWidth,  dow = docEl.offsetWidth;
    const bsw = body.scrollWidth,   bow = body.offsetWidth;
    const dsh = docEl.scrollHeight, doh = docEl.offsetHeight;
    const bsh = body.scrollHeight,  boh = body.offsetHeight;
    const vw = Viewport.width, vh = Viewport.height;

    this.maxScrollX = Math.max(dsw, dow, bsw, bow) - vw;
    this.maxScrollY = Math.max(dsh, doh, bsh, boh) - vh;

    this.maxScrollX = Math.max(0, this.maxScrollX);
    this.maxScrollY = Math.max(0, this.maxScrollY);
    this.updateProgress();
  }

  private updateProgress(): void {
    this.progressX = this.maxScrollX > 0 ? this.scrollX / this.maxScrollX : 0;
    this.progressY = this.maxScrollY > 0 ? this.scrollY / this.maxScrollY : 0;
  }

  private handleScroll = (e: Event): void => {
    if (typeof window === "undefined") return;
    this.scrollX = window.scrollX ?? window.pageXOffset ?? 0;
    this.scrollY = window.scrollY ?? window.pageYOffset ?? 0;
    this.updateProgress();
    this.hasScrolledThisFrame = true;
    this._lastScrollEvent = e;
  };

  /**
   * Main mathematical update loop.
   * @param deltaTime Optional time in ms. If omitted, computes its own delta based on performance.now().
   */
  public update(deltaTime?: number): void {
    let dt: number;
    
    if (deltaTime !== undefined) dt = deltaTime / 1000;
    else { // Standalone mode
      const now = performance.now();
      const rawDelta = this._lastExternalTick > 0 ? now - this._lastExternalTick : 16.67;
      this._lastExternalTick = now;
      dt = rawDelta / 1000;
    }
    if (dt <= 0) {
      this.hasScrolledThisFrame = false;
      return;
    }

    const scrollDiff = Math.abs(this.lerpScrollX - this.scrollX) + Math.abs(this.lerpScrollY - this.scrollY);
    if (!this.hasScrolledThisFrame && this.velocityX === 0 && this.velocityY === 0 && scrollDiff < 0.2) {
      this.lerpScrollX = this.scrollX;
      this.lerpScrollY = this.scrollY;
      this.lerpProgressX = this.progressX;
      this.lerpProgressY = this.progressY;
      return;
    }

    this.lerpScrollX = lerpContextual(this.lerpScrollX, this.scrollX, this.lerpFactor, dt);
    this.lerpScrollY = lerpContextual(this.lerpScrollY, this.scrollY, this.lerpFactor, dt);

    this.lerpProgressX = lerpContextual(this.lerpProgressX, this.progressX, this.lerpFactor, dt);
    this.lerpProgressY = lerpContextual(this.lerpProgressY, this.progressY, this.lerpFactor, dt);

    if (this.hasScrolledThisFrame) {
      this.velocityX = (this.scrollX - this.prevScrollX) / dt;
      this.velocityY = (this.scrollY - this.prevScrollY) / dt;

      this.prevScrollX = this.scrollX;
      this.prevScrollY = this.scrollY;
      this.hasScrolledThisFrame = false;

      if (this.onScrollCallback) this.onScrollCallback(this, this._lastScrollEvent);
    } else {
      // factor 8 simulates natural deceleration of native scroll
      this.velocityX = lerpContextual(this.velocityX, 0, 8, dt);
      this.velocityY = lerpContextual(this.velocityY, 0, 8, dt);

      if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
      if (Math.abs(this.velocityY) < 0.1) this.velocityY = 0;

      if (this.onScrollCallback && scrollDiff > 0.2) this.onScrollCallback(this, this._lastScrollEvent);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.removeListeners();
    if (this._tickerCallback) (Ticker.remove(this._tickerCallback), this._tickerCallback = null);
  }

  // Helpers
  public scrollTo(x: number, y: number, behavior: ScrollBehavior = "smooth"): void {
    window.scrollTo({ top: y, left: x, behavior });
  }

  public scrollToProgress(progressY: number, behavior: ScrollBehavior = "smooth"): void {
    this.scrollTo(this.scrollX, this.maxScrollY * progressY, behavior);
  }

}

export const Scroll = /* @__PURE__ */ new ScrollTracker();

// ======================================
// SCROLL SECTION
// ======================================

export interface ScrollSectionOptions {
  /** The target HTML element to track */
  element:         HTMLElement;
  /** Optional callback triggered on update */
  onUpdate?:       (section: ScrollSection) => void;
  /** Disables auto-registration of the Affer Ticker */
  externalTicker?: boolean;
}

/**
 * Represents a DOM section tracked for scroll progress.
 */
export class ScrollSection {

  public element: HTMLElement;
  public progress = 0;
  public isDestroyed = false;

  /** * Geometrically derived smoothed progress.
   * It relies on the ScrollTracker's lerpScrollY rather than its own lerp computation.
   */
  public lerpProgress = 0;
  public inView = false;

  // Telemetry
  public topAbs = 0;             // Top position relative to the DOM start
  public bottomAbs = 0;          // Bottom position relative to the DOM start
  public height = 0;             // Real height of the element

  public topViewport = 0;        // Top position relative to the viewport
  public bottomViewport = 0;     // Bottom position relative to the viewport

  public lerpTopViewport = 0;    // Top position smoothed mathematically
  public lerpBottomViewport = 0; // Bottom position smoothed mathematically

  private onUpdateCallback?: (section: ScrollSection) => void;
  private scrollTracker:     ScrollTracker;
  private observer:          IntersectionObserver | null = null;
  private _externalTicker:   boolean;

  constructor(options: ScrollSectionOptions, scrollTracker?: ScrollTracker) {
    this.element = options.element;
    this.onUpdateCallback = options.onUpdate;
    this.scrollTracker = scrollTracker || Scroll;
    this._externalTicker = options.externalTicker ?? false;

    this.updateTelemetry = this.updateTelemetry.bind(this);
    this.cacheDimensions = this.cacheDimensions.bind(this);

    if (typeof window !== "undefined") {
      this.cacheDimensions();
      this.initIntersectionObserver();
      Viewport.addListener(this.cacheDimensions);
    }
  }

  /**
   * Caches geometry coordinates once. Triggers layout math safely outside the frame loop.
   */
  public cacheDimensions(): void {
    if (typeof window === "undefined" || !this.element) return;
    
    const rect = this.element.getBoundingClientRect();

    // rect.top is relative to current viewport. Adding native scrollY yields absolute offset.
    this.topAbs = rect.top + this.scrollTracker.scrollY;
    this.height = rect.height;
    this.bottomAbs = this.topAbs + this.height;
    
    if (this.inView) this.updateTelemetry();
  }

  /**
   * Uses modern native IntersectionObserver to toggle Ticker subscriptions.
   * Keeps CPU overhead at 0% when the section is off-screen.
   */
  private initIntersectionObserver(): void {
    if (typeof window === "undefined") return;

    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.inView = entry.isIntersecting;

        if (this.inView) {
          if (!this._externalTicker) Ticker.add(this.updateTelemetry);
        } else {
          if (!this._externalTicker) Ticker.remove(this.updateTelemetry);
          if (this.progress > 0 && this.progress < 1) {
            this.progress = this.scrollTracker.scrollY >= this.bottomAbs ? 1 : 0;
            this.lerpProgress = this.progress;
            if (this.onUpdateCallback) this.onUpdateCallback(this);
          }
        }
      },
      {
        rootMargin: "200px 0px 200px 0px", 
        threshold:  0,
      },
    );

    this.observer.observe(this.element);
  }

  /**
   * Mathematical state synchronization.
   * Can be passed directly to 'createTickerBundle' due to structural typing.
   */
  public update(_deltaTime?: number): void {
    if (this.inView) this.updateTelemetry();
  }

  public updateTelemetry(): void {
    if (typeof window === "undefined") return;

    const currentScrollY = this.scrollTracker.scrollY;
    const currentLerpScrollY = this.scrollTracker.lerpScrollY;
    const viewportHeight = Viewport.height;

    this.topViewport = this.topAbs - currentScrollY;
    this.bottomViewport = this.bottomAbs - currentScrollY;

    this.lerpTopViewport = this.topAbs - currentLerpScrollY;
    this.lerpBottomViewport = this.bottomAbs - currentLerpScrollY;

    const startScroll = this.topAbs - viewportHeight;
    const endScroll = this.bottomAbs;
    const range = endScroll - startScroll;

    if (range > 0) {
      this.progress = clamp((currentScrollY - startScroll) / range, 0, 1);
      this.lerpProgress = clamp((currentLerpScrollY - startScroll) / range, 0, 1);
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this);
    }
  }

  public rebind(newElement: HTMLElement): void {
    if (this.observer && this.element) {
      this.observer.unobserve(this.element);
    }
    this.element = newElement;
    this.cacheDimensions();
    if (this.observer) {
      this.observer.observe(this.element);
    }
  }

  public get velocityY(): number { return this.scrollTracker.velocityY; }
  public get velocityX(): number { return this.scrollTracker.velocityX; }

  public destroy(): void {
    this.isDestroyed = true;
    Viewport.removeListener(this.cacheDimensions);
    if (!this._externalTicker) Ticker.remove(this.updateTelemetry);
    if (this.observer) this.observer.disconnect();
  }

}
