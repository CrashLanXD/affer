import Ticker from './ticker';
import { lerp, dist, angle } from './utils';

export interface MouseCoordinates {
  x: number;
  y: number;
}

export interface MouseTrackerOptions {
  /** Interpolation factor for smooth coordinates. Range [0, 1]. Default 0.1 */
  lerpFactor?: number;
  /** Whether touch movement should update coordinates. Default true */
  trackTouch?: boolean;
  /** Optional callback fired when the cursor moves */
  onMove?: (tracker: MouseTracker) => void;
}

export class MouseTracker {
  /** Current raw coordinates in pixels */
  public px: MouseCoordinates = { x: 0, y: 0 };
  /** Normalized coordinates [0, 1] relative to viewport dimensions */
  public normalized: MouseCoordinates = { x: 0.5, y: 0.5 };
  /** Normalized coordinates [-1, 1] centered on the viewport (ideal for WebGL) */
  public centered: MouseCoordinates = { x: 0, y: 0 };

  /** Smoothed raw coordinates in pixels */
  public lerpPx: MouseCoordinates = { x: 0, y: 0 };
  /** Smoothed normalized coordinates [0, 1] */
  public lerpNormalized: MouseCoordinates = { x: 0.5, y: 0.5 };
  /** Smoothed centered coordinates [-1, 1] */
  public lerpCentered: MouseCoordinates = { x: 0, y: 0 };

  /** Cursor speed in pixels per second */
  public velocity = 0;
  /** Angle of movement in radians */
  public angle = 0;
  /** Direction name representation (e.g. 'up', 'down-right', 'none') */
  public direction = 'none';

  /** Whether the mouse cursor is currently inside the document window */
  public isInside = false;
  /** Whether the mouse button / touch screen is pressed */
  public isPressed = false;

  /** Active input device: 'mouse' or 'touch' */
  public inputType: 'mouse' | 'touch' = 'mouse';
  /** Number of clicks detected within the last 1 second */
  public clicksPerSecond = 0;
  /** Streak of rapid clicks (within 400ms interval) */
  public clickStreak = 0;
  /** Last clicked button: 'left', 'middle', 'right', or 'none' */
  public lastClickType: 'left' | 'middle' | 'right' | 'none' = 'none';


  private lerpFactor: number;
  private trackTouch: boolean;
  private onMoveCallback?: (tracker: MouseTracker) => void;

  private prevPx: MouseCoordinates = { x: 0, y: 0 };
  private hasMovedThisFrame = false;
  private hasEntered = false;
  private clickTimes: number[] = [];
  private lastClickTime = 0;


  constructor(options: MouseTrackerOptions = {}) {
    this.lerpFactor = options.lerpFactor ?? 0.1;
    this.trackTouch = options.trackTouch ?? true;
    this.onMoveCallback = options.onMove;

    this.update = this.update.bind(this);

    // Starting values centered, but we snap upon actual document entry
    const startX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
    const startY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

    this.px = { x: startX, y: startY };
    this.prevPx = { x: startX, y: startY };
    this.lerpPx = { x: startX, y: startY };

    this.updateCoords(startX, startY);
    this.updateLerpCoords(startX, startY);

    this.initListeners();
    Ticker.add(this.update);
  }

  private initListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    window.addEventListener('mousedown', this.handleMouseDown, { passive: true });
    window.addEventListener('mouseup', this.handleMouseUp, { passive: true });
    
    document.addEventListener('mouseenter', this.handleMouseEnter, { passive: true });
    document.addEventListener('mouseleave', this.handleMouseLeave, { passive: true });

    if (this.trackTouch) {
      window.addEventListener('touchstart', this.handleTouchStart, { passive: true });
      window.addEventListener('touchmove', this.handleTouchMove, { passive: true });
      window.addEventListener('touchend', this.handleTouchEnd, { passive: true });
      window.addEventListener('touchcancel', this.handleTouchEnd, { passive: true });
    }
  }

  private removeListeners(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    
    document.removeEventListener('mouseenter', this.handleMouseEnter);
    document.removeEventListener('mouseleave', this.handleMouseLeave);

    if (this.trackTouch) {
      window.removeEventListener('touchstart', this.handleTouchStart);
      window.removeEventListener('touchmove', this.handleTouchMove);
      window.removeEventListener('touchend', this.handleTouchEnd);
      window.removeEventListener('touchcancel', this.handleTouchEnd);
    }
  }

  private updateCoords(clientX: number, clientY: number): void {
    this.px.x = clientX;
    this.px.y = clientY;

    const w = typeof window !== 'undefined' ? window.innerWidth || 1 : 1;
    const h = typeof window !== 'undefined' ? window.innerHeight || 1 : 1;

    this.normalized.x = clientX / w;
    this.normalized.y = clientY / h;

    this.centered.x = (clientX / w) * 2 - 1;
    this.centered.y = (clientY / h) * -2 + 1; // Standardize WebGL: y-up positive
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
    this.inputType = 'mouse';
    if (!this.hasEntered) {
      this.hasEntered = true;
      this.updateCoords(e.clientX, e.clientY);
      this.updateLerpCoords(e.clientX, e.clientY);
    } else {
      this.updateCoords(e.clientX, e.clientY);
    }
    this.hasMovedThisFrame = true;
    if (this.onMoveCallback) this.onMoveCallback(this);
  };


  private handleMouseDown = (e: MouseEvent): void => {
    this.isPressed = true;
    this.inputType = 'mouse';

    // Determine click type
    if (e.button === 0) this.lastClickType = 'left';
    else if (e.button === 1) this.lastClickType = 'middle';
    else if (e.button === 2) this.lastClickType = 'right';
    else this.lastClickType = 'none';

    // Click streak and clicks per second
    const now = performance.now();
    this.clickTimes.push(now);
    
    // Clean old clicks
    this.clickTimes = this.clickTimes.filter(t => now - t < 1000);
    this.clicksPerSecond = this.clickTimes.length;

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

  private handleMouseEnter = (): void => {
    this.isInside = true;
    this.inputType = 'mouse';
  };

  private handleMouseLeave = (): void => {
    this.isInside = false;
    this.isPressed = false;
  };


  private handleTouchStart = (e: TouchEvent): void => {
    this.isInside = true;
    this.isPressed = true;
    this.inputType = 'touch';
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      if (!this.hasEntered) {
        this.hasEntered = true;
        this.updateCoords(touch.clientX, touch.clientY);
        this.updateLerpCoords(touch.clientX, touch.clientY);
      } else {
        this.updateCoords(touch.clientX, touch.clientY);
      }
      this.hasMovedThisFrame = true;
      if (this.onMoveCallback) this.onMoveCallback(this);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    this.isInside = true;
    this.inputType = 'touch';
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      this.updateCoords(touch.clientX, touch.clientY);
      this.hasMovedThisFrame = true;
      if (this.onMoveCallback) this.onMoveCallback(this);
    }
  };


  private handleTouchEnd = (): void => {
    this.isPressed = false;
  };

  private update(data: { deltaTime: number }): void {
    const dt = data.deltaTime;
    if (dt <= 0) return;

    // Decay click speed telemetry
    const now = performance.now();

    while (this.clickTimes.length > 0 && now - this.clickTimes[0] > 1000) this.clickTimes.shift();
    this.clicksPerSecond = this.clickTimes.length;

    // Apply LERP transitions
    this.lerpPx.x = lerp(this.lerpPx.x, this.px.x, this.lerpFactor);
    this.lerpPx.y = lerp(this.lerpPx.y, this.px.y, this.lerpFactor);

    this.lerpNormalized.x = lerp(this.lerpNormalized.x, this.normalized.x, this.lerpFactor);
    this.lerpNormalized.y = lerp(this.lerpNormalized.y, this.normalized.y, this.lerpFactor);

    this.lerpCentered.x = lerp(this.lerpCentered.x, this.centered.x, this.lerpFactor);
    this.lerpCentered.y = lerp(this.lerpCentered.y, this.centered.y, this.lerpFactor);

    // Compute velocity and directions
    if (this.hasMovedThisFrame) {
      const distance = dist(this.prevPx.x, this.prevPx.y, this.px.x, this.px.y);
      this.velocity = distance / (dt / 1000); // px per second

      if (distance > 0.05) {
        this.angle = angle(this.prevPx.x, this.prevPx.y, this.px.x, this.px.y);
        this.direction = this.getDirectionName(this.angle);
      }

      this.prevPx.x = this.px.x;
      this.prevPx.y = this.px.y;
      this.hasMovedThisFrame = false;
    } else {
      // Mouse stands still, decay velocity smoothly
      this.velocity = lerp(this.velocity, 0, 0.15);
      if (this.velocity < 1) {
        this.velocity = 0;
        this.direction = 'none';
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


  private getDirectionName(rad: number): string {
    let deg = rad * (180 / Math.PI);
    if (deg < 0) deg += 360;

    // Rounding quadrants: right is at 0/360, down is 90, left is 180, up is 270
    const index = Math.round(deg / 45) % 8;
    const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
    return directions[index];
  }

  /**
   * Destroys this instance, cleaning up all mouse and Ticker listeners.
   */
  public destroy(): void {
    this.removeListeners();
    Ticker.remove(this.update);
  }
}

export default MouseTracker;
