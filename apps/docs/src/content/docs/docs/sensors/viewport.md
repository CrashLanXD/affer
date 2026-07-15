---
title: Viewport
description: Track viewport size, device pixel ratio, orientation, and media queries.
---

The Viewport sensor provides a continuously updated representation of the browser viewport.

Instead of listening to `window.resize` events throughout your application, Affer keeps viewport information synchronized and exposes it as readable state.

This includes:
- Viewport dimensions
- Device pixel ratio (DPR)
- Visual viewport dimensions (pinch-zoom & virtual keyboards)
- Orientation states
- Centralized media queries

The sensor is implemented as a singleton because a browser window has only one viewport.

```ts
import { Viewport } from "@clxd/affer";

```

---

## Quick Start

The Viewport sensor updates its internal state automatically. In most update cycles (such as Affer's `Ticker`), you do not need to register listeners; you can read properties directly on demand:

```ts
import { Viewport, Ticker } from "@clxd/affer";

// No browser events are attached here—Viewport simply exposes its current state.
Ticker.add(() => {
    renderer.resize(Viewport.width, Viewport.height);
    camera.aspect = Viewport.aspect;
});

```

If you need a reactive approach, you can register a listener to receive updates:

```ts
// addListener returns a dispose function to clean up the listener
const dispose = Viewport.addListener((state) => {
    console.log(`Viewport resized to: ${state.width}x${state.height}`);
});

// Unregister when no longer needed
dispose();

```

---

## Why this Sensor exists

Listening to browser events directly quickly becomes repetitive and unoptimized in large applications. Multiple independent resize listeners often lead to duplicated work, inconsistent update timing, and fragmented application logic.

Viewport centralizes event management under a single browser listener and exposes browser dimensions as continuously readable state. This allows systems to query viewport state without attaching additional browser listeners.

---

## Configuration

You can configure how browser events update the sensor's state.

```ts
Viewport.configure({
  mode: "sync",
  debounceDelay: 150,
  throttleLimit: 100
});

```

### Modes

| Mode | Description |
| --- | --- |
| `"sync"` | Updates once per update cycle, aligned with the screen refresh rate (1 rAF). |
| `"debounce"` | Waits until the user finishes resizing before updating the state. |
| `"throttle"` | Limits updates to a fixed interval. |

:::tip
Most applications should keep the default `"sync"` mode. Use `debounce` or `throttle` only when saving execution frequency becomes more important than real-time frame accuracy.
:::

---

## Properties

All properties expose the current viewport state and should be treated as read-only.

| Property | Type | Description |
| --- | --- | --- |
| `width` | `number` | Viewport width in CSS pixels. |
| `height` | `number` | Viewport height in CSS pixels. |
| `aspect` | `number` | Current aspect ratio (`width / height`). |
| `dpr` | `number` | Current screen `devicePixelRatio`. |
| `visualWidth` | `number` | Visual viewport width (reflects mobile pinch-zooms). |
| `visualHeight` | `number` | Visual viewport height (accounts for virtual keyboards). |
| `isPortrait` | `boolean` | Whether the viewport height is greater than or equal to its width. |
| `orientation` | `"portrait" \| "landscape"` | Derived aspect ratio orientation mode. |
| `state` | `ViewportData` | Returns the internal live state object. |

> `orientation` is calculated from actual viewport window layout dimensions instead of `screen.orientation`, meaning it accurately reflects desktop browser window scaling.

> `state` returns the internal live state object used by Viewport. It must be treated as read-only and should never be mutated at runtime.

---

## Methods

### `configure(config)`

Updates the state update strategy. Returns the `Viewport` instance for method chaining.

```ts
Viewport
  .configure({ mode: "debounce", debounceDelay: 250 })
  .addListener((state) => { /* ... */ });

```

---

### `addListener(listener)`

Registers a listener. Listeners are invoked **immediately** upon registration with the current viewport state.

Returns a `dispose` function to remove the listener.

```ts
const dispose = Viewport.addListener((state) => {
  console.log(state.width);
});

// To unregister:
dispose();

```

---

### `removeListener(listener)`

Removes a previously registered listener manually if you did not capture the returned `dispose` function.

```ts
Viewport.removeListener(onResizeListener);

```

---

### `matchMedia(query, listener)`

Registers a media query listener. Returns a cleanup function.

```ts
const dispose = Viewport.matchMedia("(max-width: 768px)", (matches) => {
  console.log("Is mobile viewport:", matches);
});

// Clean up listener
dispose();

```

---

### `resizeCanvas(canvas, width?, height?)`

Resizes a canvas using the active device pixel ratio.

Modern high-density displays (such as HiDPI or Retina screens) often feature a higher physical device pixel ratio than standard CSS pixels. `resizeCanvas` automatically scales the hardware drawing buffer while maintaining the CSS display size, producing crisp rendering without interpolation blur.

```ts
Viewport.resizeCanvas(canvas);

```

Returns a `Readonly` size object:

```ts
{
  width: number;
  height: number;
  dpr: number;
}

```

---

### `autoResizeCanvas(canvas, listener?)`

Automatically synchronizes a canvas layout element resolution with the active Viewport state changes. Returns a cleanup function.

```ts
const dispose = Viewport.autoResizeCanvas(canvas, (dims) => {
  // Triggers automatically inside a synchronized update cycle
  renderer.render(scene, camera);
});

// Clean up when destroying the view
dispose();

```

---

### `destroy()`

Removes all internal listeners and completely detaches the central handlers from the browser context window.

:::caution[warning]
Most applications never need to call `destroy()`. It exists primarily for testing environments, micro-frontends, or applications that dynamically create and dispose browser frame contexts.
:::

---

## Examples

### Canvas Auto-Resizing

Ensure your canvas elements render crisply on high-DPI screens without writing manual resize orchestration code:

```ts
import { Viewport } from "@clxd/affer";

const canvas = document.querySelector("canvas");

// Keep the canvas sharp and synchronized with the browser window
const dispose = Viewport.autoResizeCanvas(canvas, (dims) => {
  // Optional: Update your custom drawing logic with the new dimensions
  console.log(`Canvas resized to physical resolution: ${dims.width * dims.dpr}px`);
});

```

### Responsive UI Logic

Read state values directly within your conditional statements instead of nesting logic inside resize events:

```ts
import { Viewport } from "@clxd/affer";

function updateLayout() {
  if (Viewport.width < 768) {
    initMobileNavigation();
  } else {
    initDesktopNavigation();
  }
}

```

### Three.js Integration

Read camera aspect properties on demand inside your animation frames without binding extra resize hooks:

```ts
import { Viewport, Ticker } from "@clxd/affer";

Ticker.add(() => {
  // Read properties directly on demand
  camera.aspect = Viewport.aspect;
  camera.updateProjectionMatrix();
  
  renderer.setSize(Viewport.width, Viewport.height, false);
  renderer.render(scene, camera);
});

```

### Media Queries

Evaluate media rules dynamically and listen to change transitions safely:

```ts
import { Viewport } from "@clxd/affer";

const dispose = Viewport.matchMedia("(prefers-color-scheme: dark)", (isDark) => {
  if (isDark) {
    enableDarkMode();
  } else {
    enableLightMode();
  }
});

```

---

## Performance Notes

* **DPR Monitoring:** Moving a browser window between monitors with different display scales triggers updates automatically. Viewport handles this transition via an internal resolution watcher, ensuring graphics scale accurately without requiring manual window resizing inputs.
* **Single Resize Pipeline:** Regardless of how many systems consume Viewport, browser resize events are processed only once before the updated state becomes available to every consumer.

---

## Browser Compatibility

* Fully compatible with all modern environments supporting `window.visualViewport`.
* Built-in protection for Server-Side Rendering (SSR) environments.
* Viewport automatically detects support for `window.visualViewport` and falls back to standard viewport measurements when unavailable.

---

## Types

```ts
export interface ViewportData {
  readonly width:        number;
  readonly height:       number;
  readonly aspect:       number;
  readonly dpr:          number;
  readonly visualWidth:  number;
  readonly visualHeight: number;
  readonly isPortrait:   boolean;
  readonly orientation:  "portrait" | "landscape";
}

export interface ViewportConfig {
  debounceDelay?: number;
  throttleLimit?: number;
  mode?:          "sync" | "debounce" | "throttle";
}

```