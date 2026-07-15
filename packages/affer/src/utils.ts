/**
 * Clamps a number between a minimum and maximum value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linearly interpolates between two values.
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Linearly interpolates between two values independently of frame rate.
 * @param start Current value
 * @param end Target value
 * @param speed Speed factor (higher = faster)
 * @param dt Delta time in seconds
 */
export function lerpContextual(start: number, end: number, speed: number, dt: number): number {
  return start + (end - start) * (1 - Math.exp(-speed * dt));
}

/**
 * Maps a number from one range to another.
 */
export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMin === inMax) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Debounces a function, delaying its execution until a specified delay has passed
 * since the last time it was called.
 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number):
((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeoutId !== null) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * Throttles a function, limiting its execution to at most once per limit duration.
 * Includes both leading edge (immediate execution) and trailing edge (guarantees the last call executes).
 */
export function throttle<T extends (...args: any[]) => void>(fn: T, limit: number): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    if (!timeoutId) {
      fn.apply(this, args);

      const cooldown = () => {
        if (lastArgs) {
          fn.apply(lastThis, lastArgs);
          lastArgs = null;
          lastThis = null;
          timeoutId = setTimeout(cooldown, limit);
        } else timeoutId = null;
      };

      timeoutId = setTimeout(cooldown, limit);
    } else {
      lastArgs = args;
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      lastThis = this;
    }
  };

  throttled.cancel = function () {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Throttles a function to run at most once per animation frame (requestAnimationFrame).
 */
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): ((...args: Parameters<T>) => void) & { cancel: () => void } {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastThis: any = null;

  const throttled = function (this: any, ...args: Parameters<T>) {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        fn.apply(lastThis, lastArgs!);
        lastArgs = null;
        lastThis = null;
      });
    }
  };

  throttled.cancel = function () {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
    lastThis = null;
  };

  return throttled;
}

/**
 * Calculates the Euclidean distance between two points.
 */
export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the squared Euclidean distance.
 * Faster than dist() because it avoids the square root.
 * Use this for distance comparisons.
 */
export function distSq(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculates the angle between two points in radians (relative to x-axis, clockwise direction).
 */
export function angle(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Wraps a value around a range.
 */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/**
 * Normalizes a value to a 0-1 range based on a min and max.
 * Like mapRange, but strictly clamped to [0, 1].
 * @note When min === max, return 0 to avoid division by zero.
 */
export function normalize(value: number, min: number, max: number): number {
  if (min === max) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}
