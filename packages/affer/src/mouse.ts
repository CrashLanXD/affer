import Ticker, { type TickCallback, type TickData } from "./ticker";
import Viewport from "./viewport";
import { lerp, lerpContextual, dist, angle } from "./utils";

export interface MouseCoordinates {
  x: number;
  y: number;
}

export interface MouseTrackerOptions {
  /** Interpolation factor for smooth coordinates. Default 10 */
  lerpFactor?: number;
  /**
   * Whether touch should be treated as a single pointer substitute for mouse.
   * For multi-touch gestures (pinch, swipe), use TouchTracker instead.
   */
  trackTouch?: boolean;
  /** Optional callback fired when the cursor moves */
  onMove?:     (tracker: MouseTracker) => void;

  externalTicker?: boolean;
}

export class MouseTracker {
  
  /** Current raw coordinates in pixels */
  public px:         MouseCoordinates = { x: 0, y: 0 };
  /** Normalized coordinates [0, 1] relative to viewport dimensions */
  public normalized: MouseCoordinates = { x: 0.5, y: 0.5 };
  /** Normalized coordinates [-1, 1] centered on the viewport (ideal for WebGL) */
  public centered:   MouseCoordinates = { x: 0, y: 0 };

  /** Smoothed raw coordinates in pixels */
  public lerpPx:         MouseCoordinates = { x: 0, y: 0 };
  /** Smoothed normalized coordinates [0, 1] */
  public lerpNormalized: MouseCoordinates = { x: 0.5, y: 0.5 };
  /** Smoothed centered coordinates [-1, 1] */
  public lerpCentered:   MouseCoordinates = { x: 0, y: 0 };

  /** Cursor speed in pixels per second */
  public velocity = 0;
  /** Angle of movement in radians */
  public angle = 0;
  /** Direction name representation (e.g. "up", "down-right", "none") */
  public direction = "none";

  /** Whether the mouse cursor is currently inside the document window */
  public isInside = false;
  /** Whether the mouse button / touch screen is pressed */
  public isPressed = false;

  /** Active input device: "mouse" or "touch" */
  public inputType:     "mouse" | "touch" = "mouse";
  /** Number of clicks detected within the last 1 second */
  public clicksPerSecond = 0;
  /** Streak of rapid clicks (within 400ms interval) */
  public clickStreak = 0;
  /** Last clicked button: "left", "middle", "right", or "none" */
  public lastClickType: "left" | "middle" | "right" | "none" = "none";
  public isDestroyed = false;

  private lerpFactor:      number;
  private trackTouch:      boolean;
  private onMoveCallback?: (tracker: MouseTracker) => void;

  private prevPx: MouseCoordinates = { x: 0, y: 0 };
  private hasMovedThisFrame = false;
  private hasEntered = false;
  private lastClickTime = 0;

  private clickTimes = new Float64Array(32); // Should this be 64 or more?
  private clickIndex = 0;

  private _externalTicker: boolean;
  private _lastExternalTick = 0;
  private _tickerCallback: TickCallback | null = null;

  constructor(options: MouseTrackerOptions = {}) {
    this.lerpFactor = options.lerpFactor ?? 10;
    this.trackTouch = options.trackTouch ?? true;
    this.onMoveCallback = options.onMove;

    this.update = this.update.bind(this);

    const startX = Viewport.width / 2;
    const startY = Viewport.height / 2;

    this.px = { x: startX, y: startY };
    this.prevPx = { x: startX, y: startY };
    this.lerpPx = { x: startX, y: startY };

    this.updateCoords(startX, startY);
    this.updateLerpCoords(startX, startY);

    this.initListeners();
    this._externalTicker = options.externalTicker ?? false;
    if (!this._externalTicker) {
      this._tickerCallback = (data: TickData) => this.update(data.deltaTime);
      Ticker.add(this._tickerCallback);
    }
  }

  private initListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("mousemove", this.handleMouseMove, { passive: true });
    window.addEventListener("mousedown", this.handleMouseDown, { passive: true });
    window.addEventListener("mouseup",   this.handleMouseUp,   { passive: true });
    
    window.addEventListener("mouseout", this.handleMouseOut, { passive: true });
    window.addEventListener("blur",     this.handleBlur,     { passive: true });

    if (this.trackTouch) {
      window.addEventListener("touchstart",  this.handleTouchStart, { passive: true });
      window.addEventListener("touchmove",   this.handleTouchMove,  { passive: true });
      window.addEventListener("touchend",    this.handleTouchEnd,   { passive: true });
      window.addEventListener("touchcancel", this.handleTouchEnd,   { passive: true });
    }
  }

  private removeListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup",   this.handleMouseUp);
    
    window.removeEventListener("mouseout", this.handleMouseOut);
    window.removeEventListener("blur",     this.handleBlur);

    if (this.trackTouch) {
      window.removeEventListener("touchstart",  this.handleTouchStart);
      window.removeEventListener("touchmove",   this.handleTouchMove);
      window.removeEventListener("touchend",    this.handleTouchEnd);
      window.removeEventListener("touchcancel", this.handleTouchEnd);
    }
  }

  private updateCoords(clientX: number, clientY: number): void {
    this.px.x = clientX;
    this.px.y = clientY;
    
    this.normalized.x = clientX / Viewport.width;
    this.normalized.y = clientY / Viewport.height;

    this.centered.x = (clientX / Viewport.width) * 2 - 1;
    this.centered.y = (clientY / Viewport.height) * -2 + 1; // Standardize WebGL: y-up positive
  }

  private updateLerpCoords(clientX: number, clientY: number): void {
    this.lerpPx.x = clientX;
    this.lerpPx.y = clientY;
    this.lerpNormalized.x = this.normalized.x;
    this.lerpNormalized.y = this.normalized.y;
    this.lerpCentered.x = this.centered.x;
    this.lerpCentered.y = this.centered.y;
  }

  private handleMouseMove = (e: MouseEvent): void => {
    this.isInside = true;
    this.inputType = "mouse";
    if (!this.hasEntered) {
      this.hasEntered = true;
      this.prevPx.x = e.clientX;
      this.prevPx.y = e.clientY;
      this.updateCoords(e.clientX, e.clientY);
      this.updateLerpCoords(e.clientX, e.clientY);
    } else {
      this.updateCoords(e.clientX, e.clientY);
    }
    this.hasMovedThisFrame = true;
  };


  private handleMouseDown = (e: MouseEvent): void => {
    this.isPressed = true;
    this.inputType = "mouse";

    // Determine click type
    if (e.button === 0) this.lastClickType = "left";
    else if (e.button === 1) this.lastClickType = "middle";
    else if (e.button === 2) this.lastClickType = "right";
    else this.lastClickType = "none";

    // Click streak and clicks per second
    const now = performance.now();
    this.clickTimes[this.clickIndex] = now;
    this.clickIndex = (this.clickIndex + 1) & 31;

    if (now - this.lastClickTime < 400) {
      this.clickStreak++;
    } else {
      this.clickStreak = 1;
    }
    this.lastClickTime = now;
  };

  private handleMouseUp = (): void => {
    this.isPressed = false;
  };

  private handleMouseOut = (e: MouseEvent): void => {
    if (!e.relatedTarget) {
      this.isInside = false;
      this.isPressed = false;
    }
  };

  private handleBlur = (): void => {
    this.isInside = false;
    this.isPressed = false;
  };

  private handleTouchStart = (e: TouchEvent): void => {
    this.isInside = true;
    this.isPressed = true;
    this.inputType = "touch";
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (!this.hasEntered) {
        this.hasEntered = true;
        this.prevPx.x = touch.clientX;
        this.prevPx.y = touch.clientY;
        this.updateCoords(touch.clientX, touch.clientY);
        this.updateLerpCoords(touch.clientX, touch.clientY);
      } else {
        this.updateCoords(touch.clientX, touch.clientY);
      }
      this.hasMovedThisFrame = true;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    this.isInside = true;
    this.inputType = "touch";
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updateCoords(touch.clientX, touch.clientY);
      this.hasMovedThisFrame = true;
    }
  };

  private handleTouchEnd = (): void => {
    this.isPressed = false;
  };

  public update(deltaTime?: number): void {
    let dt: number;

    if (deltaTime !== undefined) dt = deltaTime / 1000;
    else { // Standalone mode
      const now = performance.now();
      const rawDelta = this._lastExternalTick > 0 ? now - this._lastExternalTick : 16.67;
      this._lastExternalTick = now;
      dt = rawDelta / 1000;
    }

    if (dt <= 0) return;

    // Decay click speed telemetry
    const now = performance.now();
    let activeClicks = 0;
    for (let i = 0; i < 32; i++) if (now - this.clickTimes[i] < 1000) activeClicks++;
    this.clicksPerSecond = activeClicks;

    // Manhattan distance
    const lerpDiff = Math.abs(this.lerpPx.x - this.px.x) + Math.abs(this.lerpPx.y - this.px.y);

    // Early return, full Snap
    if (!this.hasMovedThisFrame && this.velocity === 0 && lerpDiff < 0.1) {
      this.lerpPx.x = this.px.x;
      this.lerpPx.y = this.px.y;
      this.lerpNormalized.x = this.normalized.x;
      this.lerpNormalized.y = this.normalized.y;
      this.lerpCentered.x = this.centered.x;
      this.lerpCentered.y = this.centered.y;
      return;
    };

    // Apply LERP transitions
    this.lerpPx.x = lerpContextual(this.lerpPx.x, this.px.x, this.lerpFactor, dt);
    this.lerpPx.y = lerpContextual(this.lerpPx.y, this.px.y, this.lerpFactor, dt);

    this.lerpNormalized.x = lerpContextual(this.lerpNormalized.x, this.normalized.x, this.lerpFactor, dt);
    this.lerpNormalized.y = lerpContextual(this.lerpNormalized.y, this.normalized.y, this.lerpFactor, dt);

    this.lerpCentered.x = lerpContextual(this.lerpCentered.x, this.centered.x, this.lerpFactor, dt);
    this.lerpCentered.y = lerpContextual(this.lerpCentered.y, this.centered.y, this.lerpFactor, dt);

    // Compute velocity and directions
    if (this.hasMovedThisFrame) {
      const distance = dist(this.prevPx.x, this.prevPx.y, this.px.x, this.px.y);
      this.velocity = distance / dt; // px per second

      if (distance > 0.05) {
        this.angle = angle(this.prevPx.x, this.prevPx.y, this.px.x, this.px.y);
        this.direction = this.getDirectionName(this.angle);
      }

      this.prevPx.x = this.px.x;
      this.prevPx.y = this.px.y;
      this.hasMovedThisFrame = false;

      if (this.onMoveCallback) this.onMoveCallback(this);
    } else {
      // Mouse stands still, decay velocity smoothly
      this.velocity = lerp(this.velocity, 0, 0.15);
      if (this.velocity < 1) {
        this.velocity = 0;
        this.direction = "none";
      }

      // While LERP is still active, we're still moving
      if (this.onMoveCallback && lerpDiff > 0.1) {
        this.onMoveCallback(this);
      }
    }
  }

  /**
   * Rebinds all mouse/touch listeners.
   */
  public rebind(): void {
    this.removeListeners();
    this.initListeners();
  }

  /**
   * Teleports the tracker to a specific coordinate, instantly snapping
   * both raw and smoothed values to the target.
   */
  public teleport(x: number, y: number): void {
    this.updateCoords(x, y);
    this.updateLerpCoords(x, y);
    this.prevPx.x = x;
    this.prevPx.y = y;
    this.velocity = 0;
    this.direction = "none";
    if (this.onMoveCallback) this.onMoveCallback(this);
  }

  /** Get the current interpolation factor */
  public get smoothing(): number {
    return this.lerpFactor;
  }

  /** Dynamically set the interpolation factor */
  public set smoothing(value: number) {
    this.lerpFactor = Math.max(0, value);
  }

  private getDirectionName(rad: number): string {
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // Rounding quadrants: right is at 0/360, down is 90, left is 180, up is 270
    const index = Math.round(deg / 45) % 8;
    const directions = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"];
    return directions[index];
  }

  /**
   * Destroys this instance, cleaning up all mouse and Ticker listeners.
   */
  public destroy(): void {
    this.isDestroyed = true;
    this.removeListeners();
    if (this._tickerCallback) {
      Ticker.remove(this._tickerCallback);
      this._tickerCallback = null;
    }
  }

}

export default MouseTracker;
