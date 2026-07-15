# affer 🧠

> A deterministic browser perception layer for real-time web applications.
>
> *Perceive the browser as a continuous world, not a stream of events.*

Browsers expose information through asynchronous events. Interactive applications think in frames. 

Affer bridges that gap by transforming browser activity into a continuous sensory state that can be queried whenever your engine updates.

> ℹ️ **Documentation Notice:** Some documentation pages and showcase demos are AI-assisted while the project is in early development.

---

## Usage

```ts
import { Mouse, Ticker } from "@clxd/affer";

const mouse = new Mouse();

Ticker.add(() => {
    // Every frame, ask the browser what is true.
    camera.lookAt(
        mouse.centered.x,
        mouse.centered.y,
        0
    );
});

```

> Just state.

---

## Philosophy

* **Browser events become continuously readable state.** Affer doesn't tell your application *what happened*, it tells it *what is true right now*.
* **Everything updates with time.** Delta time ($dt$) governs transitions, physics decay, and smoothing natively.
* **Everything is headless.** Affer produces raw mathematical data.

---

## Perception Modules

* **Mouse** -> Continuous pointer state including position, velocity, direction, and WebGL-centered coordinates.
* **Touch** -> Touch state for mobile including gestures, pinch scaling, accumulated rotation, and drags.
* **Keyboard** -> Live matrix of active keys, combination detection, and input-safe key sequences.
* **Viewport** -> Responsive environment state tracking size, DPR, aspect ratio, orientation, and media queries.
* **Scroll** -> Document displacement metrics including position, continuous velocity, and section tracking.
* **WindowCluster** -> Cross-window synchronization engine tracking absolute pointer position and screen distances.
* **Joystick** -> Virtual, fully headless mobile joystick supporting fixed or floating setups, force, and angles.
* **Ticker** -> Core frame loop orchestrator featuring native lag smoothing and priority execution queues.
* **Utilities** -> Lightweight mathematical helper utilities commonly used in spatial web development.

---

## Installation

```bash
npm i @clxd/affer

```

---

## Documentation

Full API reference, architecture guides, and interactive examples at [affer.clxd.dev](https://affer.clxd.dev).

---

## License

MIT © [clxd.dev](https://clxd.dev)

---

## 🤖 AI-assisted Documentation

> **Notice:** Some parts of the documentation website are currently AI-assisted.

As a solo developer, I'm using AI to speed up the creation of the documentation website while the project is still in its early stages.

This currently includes things such as:

- placeholder documentation pages
- showcase demos
- temporary examples
- draft explanations

These sections may contain inaccuracies, incomplete information, or implementation details that haven't yet been manually reviewed.

Whenever possible, AI-generated content will be explicitly marked so readers know it should be considered provisional.

**The library itself is different.** The implementation of `@clxd/affer` is written by me. AI may occasionally assist as a development tool, but the library's architecture, APIs, and source code are designed and implemented manually.

As the project grows, all temporary documentation will be progressively rewritten and reviewed by hand.