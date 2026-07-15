# affer 🧠

> A deterministic browser perception layer for real-time web applications.
>
> *Perceive the browser as a continuous world, not a stream of events.*

Browsers expose information through asynchronous events. Interactive applications think in frames. 

Affer bridges that gap by transforming browser activity into a continuous sensory state that can be queried whenever your engine updates.

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
