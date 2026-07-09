---
title: Cheat Sheet
description: Quick reference guide for the @clxd/affer API.
---

A reference guide highlighting the most common core methods, mathematical utilities, and trackers.

### Loop Control (Core)

| Method / Component     | Purpose                                                           | Example                                              |
| :--------------------- | :---------------------------------------------------------------- | :--------------------------------------------------- |
| `Ticker.add(fn)`       | Registers a callback into the global animation loop.              | `Ticker.add((data) => tick(data.dt))`                |
| `Ticker.remove(fn)`    | Removes a callback from the global loop.                          | `Ticker.remove(fn)`                                  |
| `createTickerBundle()` | Groups multiple updatable instances into a single execution sync. | `const bundle = createTickerBundle([mouse, scroll])` |

### Interpolations & Math (`utils`)

```typescript
import { clamp, lerp, lerpContextual, mapRange } from "@clxd/affer";

// Constrain a value between a minimum and a maximum threshold
const safeValue = clamp(input, 0, 100);

// Standard linear interpolation (framerate-dependent)
const x = lerp(currentX, targetX, 0.06);

// Contextual linear interpolation based on Delta Time (framerate-independent)
const safeX = lerpContextual(currentX, targetX, speed, dt);

// Map a number from one numeric range to another
const opacity = mapRange(mouseY, 0, window.innerHeight, 0, 1);
```
