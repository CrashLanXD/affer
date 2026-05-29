export { Ticker } from './ticker';
export type { TickData, TickCallback } from './ticker';

export { MouseTracker } from './mouse';
export type { MouseCoordinates, MouseTrackerOptions } from './mouse';

// export { ScrollTracker, ScrollSection } from './scroll';
// export type { ScrollTrackerOptions, ScrollSectionOptions } from './scroll';

// export { KeyboardTracker } from './keyboard';
// export type { KeyboardTrackerOptions, ComboCallback, SequenceCallback } from './keyboard';

// export { ViewportTracker } from './viewport';
// export type { ViewportData, ViewportTrackerOptions } from './viewport';

// export { TouchTracker, VirtualJoystick } from './touch';
// export type { SwipeData, PinchData, JoystickData, JoystickOptions, TouchTrackerOptions } from './touch';

export {
  clamp,
  lerp,
  mapRange,
  debounce,
  throttle,
  dist,
  angle,
} from './utils';
