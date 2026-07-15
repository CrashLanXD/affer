import { dist, distSq, angle as getAngle } from "./utils";

export interface SwipeData {
  direction: "up" | "down" | "left" | "right";
  distance:  number;
  velocity:  number; // pixels per second
}

export interface PinchData {
  scale:         number;
  deltaDistance: number;
  rotation:      number; // Accumulated radians
  rotationDeg:   number; // Accumulated degrees
}

export interface TapData {
  x:        number;
  y:        number;
  tapCount: number; // For spam taps
  target:   EventTarget | null; // Safe reference
}

export interface DragData {
  phase: "start" | "move" | "end";
  x:     number;
  y:     number;
  dx:    number;
  dy:    number;
}

export interface TouchTrackerOptions {
  tapThreshold?:           number;
  doubleTapTimeout?:       number;
  doubleTapDistance?:      number;
  swipeThreshold?:         number;
  swipeVelocityThreshold?: number;
  dragThreshold?:          number;
  longPressTimeout?:       number;
  continuousPinch?:        boolean;
  preventDefault?:         boolean;
}

export class TouchTracker {

  private element:                HTMLElement | Window;
  private tapThreshold:           number;
  private doubleTapTimeout:       number;
  private doubleTapDistance:      number;
  private swipeThreshold:         number;
  private swipeVelocityThreshold: number;
  private dragThreshold:          number;
  private longPressTimeout:       number;
  private continuousPinch:        boolean;
  private preventDefault:         boolean;

  public pinchData: PinchData = { scale: 1, deltaDistance: 0, rotation: 0, rotationDeg: 0 };
  public swipeData: SwipeData = { direction: "up", distance: 0, velocity: 0 };
  public isDestroyed = false;

  private onSwipeCallback?:     (data: SwipeData) => void;
  private onPinchCallback?:     (data: PinchData) => void;
  private onTapCallback?:       (data: TapData) => void;
  private onDoubleTapCallback?: (data: TapData) => void;
  private onLongPressCallback?: (data: TapData) => void;
  private onDragCallback?:      (data: DragData) => void;

  private touchStartTime = 0;
  private startX = 0;
  private startY = 0;

  private lastTapTime = 0;
  private lastTapX = 0;
  private lastTapY = 0;
  private tapCount = 0;

  private initialPinchDistance = 0;
  private lastPinchAngle = 0; // For accumulating rotation
  private basePinchScale = 0;
  private basePinchRotation = 0;

  private isPinching = false;
  private isDragging = false;
  private hasIgnoredSequence = false; // Blocks ghost taps/swipes after a pinch ends

  private longPressTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(element: HTMLElement | Window, options: TouchTrackerOptions = {}) {
    this.element = element;
    this.tapThreshold = options.tapThreshold ?? 10;
    this.doubleTapTimeout = options.doubleTapTimeout ?? 300;
    this.doubleTapDistance = options.doubleTapDistance ?? 40;
    this.swipeThreshold = options.swipeThreshold ?? 30;
    this.swipeVelocityThreshold = options.swipeVelocityThreshold ?? 200;
    this.dragThreshold = options.dragThreshold ?? 10;
    this.longPressTimeout = options.longPressTimeout ?? 600;
    this.continuousPinch = options.continuousPinch ?? false;
    this.preventDefault = options.preventDefault ?? false;

    this.initListeners();
  }

  private initListeners(): void {
    if (typeof window === "undefined" || !this.element) return;
    this.element.addEventListener("touchstart",  this.handleTouchStart as EventListener, { passive: false });
    this.element.addEventListener("touchmove",   this.handleTouchMove as EventListener,  { passive: false });
    this.element.addEventListener("touchend",    this.handleTouchEnd as EventListener,   { passive: false });
    this.element.addEventListener("touchcancel", this.handleTouchEnd as EventListener,   { passive: false });
  }

  private removeListeners(): void {
    if (typeof window === "undefined" || !this.element) return;
    this.element.removeEventListener("touchstart",  this.handleTouchStart as EventListener);
    this.element.removeEventListener("touchmove",   this.handleTouchMove as EventListener);
    this.element.removeEventListener("touchend",    this.handleTouchEnd as EventListener);
    this.element.removeEventListener("touchcancel", this.handleTouchEnd as EventListener);
  }

  private handleTouchStart = (e: TouchEvent): void => {
    if (this.preventDefault) e.preventDefault();
    this.touchStartTime = performance.now();

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.isPinching = false;
      this.isDragging = false;
      // Only reset the ignore flag if it's a clean new single touch
      if (e.changedTouches.length === e.touches.length) this.hasIgnoredSequence = false;

      // Initialize long press timer
      if (!this.hasIgnoredSequence) {
        const target = e.target; // Capture target immediately

        this.longPressTimer = setTimeout(() => {
          // Prevent ghost triggers if the DOM node was unmounted during the timeout
          if (target instanceof Node && !target.isConnected) return;

          if (!this.isDragging && !this.isPinching && !this.hasIgnoredSequence) {
            this.hasIgnoredSequence = true; // Consume gesture
            this.clearTapStreak();

            if (this.onLongPressCallback) {
              this.onLongPressCallback({ x: this.startX, y: this.startY, tapCount: 1, target: e.target });
            }
          }
        }, this.longPressTimeout);
      }
    }
    
    else if (e.touches.length === 2) {
      this.clearTapStreak();
      this.clearLongPress(); // Any multi-touch breaks a tap streak

      const t1 = e.touches[0];
      const t2 = e.touches[1];

      this.initialPinchDistance = dist(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
      this.lastPinchAngle = getAngle(t1.clientX, t1.clientY, t2.clientX, t2.clientY);

      if (!this.continuousPinch) {
        this.basePinchScale = 1;
        this.basePinchRotation = 0;
      }

      this.pinchData.scale = this.basePinchScale;
      this.pinchData.deltaDistance = 0;
      this.pinchData.rotation = this.basePinchRotation;
      this.pinchData.rotationDeg = this.basePinchRotation * (180 / Math.PI);

      this.isPinching = true;
      this.isDragging = false;
      this.hasIgnoredSequence = true; // Mark sequence as dirty so remaining fingers don't trigger ghost taps
    } else {
      // 3 or more fingers. Close any active pinch cleanly and ignore sequence
      if (this.isPinching) {
        this.isPinching = false;
        this.basePinchScale = this.pinchData.scale;
        this.basePinchRotation = this.pinchData.rotation;
      }
      this.clearLongPress();
      this.clearTapStreak();
      this.hasIgnoredSequence = true;
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (this.preventDefault || (e.touches.length === 2 && this.isPinching)) e.preventDefault();

    if (e.touches.length === 1 && !this.isPinching && !this.hasIgnoredSequence) {
      const touch = e.touches[0];
      const dx = touch.clientX - this.startX;
      const dy = touch.clientY - this.startY;

      // Start drag if threshold is met
      if (!this.isDragging && distSq(0, 0, dx, dy) > (this.dragThreshold * this.dragThreshold)) {
        this.isDragging = true;
        this.clearLongPress();
        this.clearTapStreak();

        if (this.onDragCallback) this.onDragCallback({ phase: "start", x: touch.clientX, y: touch.clientY, dx, dy });
      }

      if (this.isDragging && this.onDragCallback) {
        this.onDragCallback({ phase: "move", x: touch.clientX, y: touch.clientY, dx, dy });
      }
    }

    else if (e.touches.length === 2 && this.isPinching) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      const currentDistance = dist(t1.clientX, t1.clientY, t2.clientX, t2.clientY);
      const currentAngle = getAngle(t1.clientX, t1.clientY, t2.clientX, t2.clientY);

      const ratio = this.initialPinchDistance > 0 ? currentDistance / this.initialPinchDistance : 1;
      this.pinchData.scale = this.basePinchScale * ratio;
      this.pinchData.deltaDistance = currentDistance - this.initialPinchDistance;

      // Accumulate rotation smoothly, bypassing wrap-around jumps
      let deltaAngle = currentAngle - this.lastPinchAngle;
      while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
      while (deltaAngle >  Math.PI) deltaAngle -= Math.PI * 2;

      this.pinchData.rotation += deltaAngle;
      this.pinchData.rotationDeg = this.pinchData.rotation * (180 / Math.PI);

      this.lastPinchAngle = currentAngle;

      if (this.onPinchCallback) this.onPinchCallback(this.pinchData);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.preventDefault) e.preventDefault();
    this.clearLongPress();

    if (this.isPinching) {
      if (e.touches.length < 2) {
        this.isPinching = false;
        // Save base for continuous pinch
        this.basePinchScale = this.pinchData.scale;
        this.basePinchRotation = this.pinchData.rotation;
      }
      return;
    }

    // If the sequence was contaminated, ignore until all fingers leave
    if (this.hasIgnoredSequence) {
      if (e.touches.length === 0) this.hasIgnoredSequence = false;
      return;
    };

    const duration = performance.now() - this.touchStartTime;

    if (e.changedTouches.length === 1) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this.startX;
      const dy = touch.clientY - this.startY;

      if (this.isDragging) {
        this.isDragging = false;
        if (this.onDragCallback) this.onDragCallback({ phase: "end", x: touch.clientX, y: touch.clientY, dx, dy });
        return; // Drag is mutually exclusive with Tap and Swipe
      }

      const distance = dist(this.startX, this.startY, touch.clientX, touch.clientY);
      const velocity = (distance / (duration || 1)) * 1000; // pixels per second

      // Swipe takes priority over tap
      if (distance > this.swipeThreshold && velocity > this.swipeVelocityThreshold) {
        this.clearTapStreak(); // Swipe breaks tap streak

        this.swipeData.direction = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? "right" : "left")
          : (dy > 0 ? "down"  : "up");
        
        this.swipeData.distance = distance;
        this.swipeData.velocity = velocity;

        if (this.onSwipeCallback) this.onSwipeCallback(this.swipeData);
        return;
      }

      // Zero-lag Tap & Double Tap evaluation
      if (distance < this.tapThreshold) {
        const now = performance.now();
        const timeSinceLastTap = now - this.lastTapTime;
        const tapDistance = dist(this.startX, this.startY, this.lastTapX, this.lastTapY);

        if (timeSinceLastTap < this.doubleTapTimeout && tapDistance < this.doubleTapDistance) {
          this.tapCount++;
        } else {
          this.tapCount = 1;
        }

        this.lastTapTime = now;
        this.lastTapX = this.startX;
        this.lastTapY = this.startY;

        const tapData: TapData = { x: touch.clientX, y: touch.clientY, tapCount: this.tapCount, target: e.target };

        if (this.onTapCallback) this.onTapCallback(tapData);
        if (this.tapCount === 2 && this.onDoubleTapCallback) this.onDoubleTapCallback(tapData);
      }
    }
  };

  private clearLongPress(): void {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  private clearTapStreak(): void {
    this.tapCount = 0;
    this.lastTapTime = 0;
  }

  // Builder Pattern
  public onSwipe    (cb: (data: SwipeData) => void): this { this.onSwipeCallback = cb; return this; }
  public onPinch    (cb: (data: PinchData) => void): this { this.onPinchCallback = cb; return this; }
  public onTap      (cb: (data: TapData)   => void): this { this.onTapCallback = cb; return this; }
  public onDoubleTap(cb: (data: TapData)   => void): this { this.onDoubleTapCallback = cb; return this; }
  public onLongPress(cb: (data: TapData)   => void): this { this.onLongPressCallback = cb; return this; }
  public onDrag     (cb: (data: DragData)  => void): this { this.onDragCallback = cb; return this; }

  public rebind(newElement: HTMLElement | Window): void {
    this.removeListeners();
    this.element = newElement;
    this.initListeners();
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.removeListeners();
    this.clearLongPress();
  }

}
