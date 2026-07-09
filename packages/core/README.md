# affer 🌀

> **Headless browser trackers.**
>
> Collect browser data. Use it anywhere.

Affer is a framework-agnostic library that centralizes browser data into reusable trackers.

Track mouse movement, keyboard input, scrolling, touch gestures, viewport changes, multiple browser windows, and more using a consistent API designed for real-time applications.

Instead of thinking about event listeners, think about data.

**Current version:** `0.0.0-alpha.0`

> Alpha release. APIs are expected to evolve.

---

## Why?

Modern interactive websites often end up with many independent event listeners.

Each component reads browser state on its own.

Each animation runs its own update loop.

Each utility solves one small problem.

Affer centralizes all of this into reusable trackers that can share the same update cycle.

The result is simpler code and predictable browser data.

---

# Philosophy

Affer is not a collection of input utilities.

It is an ecosystem of browser trackers.

Every tracker:

- collects browser data
- normalizes it
- keeps it updated
- exposes a consistent API
- works independently
- works together with other trackers

Use only what you need.

Unused modules are tree-shaken away.

---

# Trackers

## Mouse

Track:

- raw coordinates
- normalized coordinates `[0,1]`
- centered coordinates `[-1,1]`
- interpolated (lerped) values
- velocity
- direction
- angle
- clicks
- click streak
- pointer type
- button state
- document enter/leave state

---

## Keyboard

Track:

- key down
- key up
- combinations

```text
Ctrl + Shift + S
```

and sequences

```text
A → B → C
```

while automatically ignoring text inputs.

---

## Scroll

Includes:

- ScrollTracker
- ScrollSection

Track:

- position
- progress
- velocity
- lerped values

or synchronize scrolling for a specific DOM element.

---

## Touch

Track mobile-specific gestures including:

- swipe
- pinch
- drag
- tap
- double tap
- long press

---

## Viewport

A singleton that keeps viewport information updated.

Includes:

- viewport size
- DPR
- aspect ratio
- orientation
- VisualViewport
- resize listeners
- matchMedia helpers
- canvas resize helpers

Supports multiple resize strategies:

- sync
- debounce
- throttle

---

## Window Cluster

Synchronize multiple browser windows.

Features include:

- automatic discovery
- leader election
- shared mouse position
- window positions
- viewport sizes
- custom messages
- heartbeat system
- automatic reconnection

Built on top of BroadcastChannel.

---

## Joystick

A fully headless virtual joystick for mobile.

Features:

- floating mode
- fixed mode
- deadzone
- 8-direction mode
- force
- angle
- direction

Bring your own HTML and CSS.

---

# Shared Ticker

Every tracker can use Affer's built-in ticker or your own animation loop.

Compatible with:

- requestAnimationFrame
- GSAP
- Three.js
- custom render loops

You can even bundle multiple trackers together into a single updater.

---

# Utilities

Affer also includes lightweight utilities commonly used in interactive applications.

Examples include:

- clamp
- lerp
- lerpContextual
- mapRange
- debounce
- throttle
- angle
- normalize
- wrap
- dist
- distSq

---

# Works with any framework

- Vanilla JavaScript
- React
- Vue
- Svelte
- Solid
- Astro
- Three.js
- GSAP
- or no framework at all.

---

# Installation

```bash
npm install affer
```

or

```bash
pnpm add affer
```

---

# Example

```ts
import { Mouse } from "affer";

const mouse = new Mouse();

console.log(mouse.px.x, mouse.px.y);
console.log(mouse.normalized.x, mouse.velocity);
```

---

# GSAP is not the competition

A common comparison is GSAP.

The two libraries solve different problems.

> **GSAP produces motion.**
>
> **Affer produces data.**

Or, put another way:

> **GSAP answers "How does it animate?"**
>
> **Affer answers "Where does the data come from?"**

They work especially well together.

Use Affer to read browser data.

Use GSAP to animate with it.

They can even share the same ticker.

---

# Documentation

https://affer.clxd.dev

---

# License

MIT