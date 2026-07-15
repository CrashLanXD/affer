---
title: Ticker
description: Central specialized animation scheduler for managing system execution timing.
---

The Ticker is Affer's central update scheduler. It synchronizes your application around a single browser animation loop and provides deterministic timing information to every registered callback.

Instead of writing custom `requestAnimationFrame` mechanics inside individual subsystems, the application registers callbacks to a single global pipeline that distributes consistent structural timing state variables.

```ts
import { Ticker } from "@clxd/affer";

```

---

## Quick Start

Register an operational sequence inside the central update cycle. The loop automatically activates upon adding the first callback:

```ts
import { Ticker } from "@clxd/affer";

// Registers a continuous operational update loop pass
const dispose = Ticker.add((tickData) => {
  console.log(`Delta time: ${tickData.deltaTime}ms`);
});

// To stop updates and detach the tracking sequence:
dispose();

```

### Leveraging Delta Ratio

When animating physical coordinates or positions, use `deltaRatio` to guarantee motion parameters remain uniform regardless of whether the user runs a 60Hz, 120Hz, or throttled screen context.

```ts
Ticker.add(({ deltaRatio }) => {
  // Movement remains constant at 60fps (ratio = 1.0) or 120fps (ratio = 0.5)
  player.x += speed * deltaRatio;
});

```

---

## Why this Core Loop exists

Creating multiple scattered `requestAnimationFrame` loops or timer hooks across an application leads to disjointed execution timing, fragmented logic, and uncoordinated frame state metrics.

Ticker establishes a single entry point for scheduling processes. It drives layout updates, state queries, or engine passes sequentially while providing unified timing metrics (`deltaTime`, `elapsedTime`, and frame configurations) ensuring logic executes inside a controlled timeline.

---

## Configuration

### `fps(targetFps)`

Limits the update cycle frequency to a fixed integer rate. Setting this property to `0` unlocks the maximum hardware refresh capability natively available.

```ts
// Enforce updates at a standard 30hz pace
Ticker.fps(30);

// Return to unconstrained screen updates
Ticker.fps(0);

```

### `lagSmoothing(threshold, adjustedLag)`

Prevents massive timing spikes when background tab context freezing or intense CPU interruptions occur. If a frame time exceeds the specified threshold, the engine forces the timing calculation to fall back to the fallback duration.

```ts
// If a frame takes longer than 500ms, simulate a standard 33ms step instead
Ticker.lagSmoothing(500, 33);

// Completely disable engine lag correction adjustments
Ticker.lagSmoothing(0);

```

---

## Properties

All runtime metrics expose live engine coordinates and must be treated as read-only.

| Property | Type | Description |
| --- | --- | --- |
| `isActive` | `boolean` | Confirms if the update cycle loop is currently running. |
| `isPaused` | `boolean` | Verifies if the loop was suspended via manual commands. |
| `time` | `number` | Total accumulated active running time calculated in seconds. |
| `frame` | `number` | Cumulative total of processed frame iterations since instantiation. |
| `listenerCount` | `number` | Active quantity of unique structural callbacks attached to the pool. |
| `stats` | `object` | Development helper snapshot containing internal operational indicators. |

---

## Methods

### `add(callback, options?)`

Appends an update block to the operational stack queue. Returns an explicit `dispose` cleanup function.

```ts
const dispose = Ticker.add((data) => {
  // Executed on every cycle frame step
}, { priority: 10, once: false });

```

| Parameter Options | Type | Default | Description |
| --- | --- | --- | --- |
| `priority` | `number` | `0` | Execution weight order. Higher numeric keys run first. |
| `once` | `boolean` | `false` | When true, automatically removes itself after one pass. |

---

### Execution Priority Architecture

Using the `priority` option guarantees dependent calculations complete in correct operational order without nesting callbacks manually:

```
Priority: 100 ──► Physics Subsystems (Runs first)
   │
Priority: 50  ──► Camera / Animation Constraints
   │
Priority: 0   ──► Renderer / Layout Drawing (Runs last)

```

---

### `once(callback, priority?)`

Shortcut utility to register an operational callback that drops out of the registry array immediately after completing its initial pass.

```ts
Ticker.once((data) => {
  console.log("Executed exactly once inside the next operational frame step.");
}, 50);

```

---

### `remove(callback)`

Removes a registered callback from the update cycle. This method can be called directly if the returned `dispose` function is not available.

```ts
Ticker.remove(myUpdateFunction);

```

---

### `pause()`

Suspends the animation request sequence without purging structural update statistics or frame counts.

```ts
Ticker.pause();

```

---

### `resume()`

Restarts the system sequence loop. If callbacks remain registered, execution resumes from the exact timeline coordinates preserved during the pause.

```ts
Ticker.resume();

```

---

## Examples

### Prioritized Pipeline Operations

```ts
// Step 1: Process positions before rendering
Ticker.add(({ deltaTime }) => {
  physicsWorld.step(deltaTime);
}, { priority: 100 });

// Step 2: Render updated positions downstream
Ticker.add(() => {
  renderer.render(scene, camera);
}, { priority: 0 });

```

---

## Performance Notes

* **Single Update Pipeline:** Regardless of how many systems consume Viewport or register tasks, browser frame updates are executed within a unified request thread to maintain consistent timing across all consumers.
* **Prioritized Array Sorting:** The internal update queue sorts listeners by priority only during registration mutations, maintaining optimized loops for raw frame execution steps.

---

## Types

```ts
export interface TickData {
  readonly deltaTime:   number;
  readonly elapsedTime: number;
  readonly frame:       number;
  readonly time:        number;
  readonly deltaRatio:  number;
}

export type TickCallback = (data: TickData) => void;

export interface TickerAddOptions {
  priority?: number;
  once?:     boolean;
}

```
