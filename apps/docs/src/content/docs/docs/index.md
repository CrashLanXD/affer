---
title: Overview
description: Learn what Affer is, why it exists, and how it changes the way browser applications perceive state.
---

# Overview

**Affer** is a headless browser perception library that transforms asynchronous browser events into continuously readable state.

Instead of wiring dozens of event listeners throughout your application, Affer centralizes browser input into reusable **Sensors** that remain synchronized over time and can be queried whenever your application updates.

The result is a deterministic, framework-agnostic foundation for interactive web applications.

```ts
import { Mouse, Viewport, Ticker } from "@clxd/affer";

Ticker.add(() => {
  camera.lookAt(
    Mouse.centered.x,
    Mouse.centered.y,
    0
  );

  renderer.resize(
    Viewport.width,
    Viewport.height
  );
});
```

Notice that the application never listens to browser events directly. It simply asks each sensor for its current state.

---

## The Problem

Browsers communicate through asynchronous events.

```text
mousemove
keydown
touchmove
resize
scroll
```

Applications, however, usually think in **frames**.

Every render loop, physics engine, animation system, or game loop needs to know the current state of the browser—not merely what happened moments ago.

Managing this often leads to duplicated event listeners, scattered state synchronization, and inconsistent timing across different parts of an application.

---

## The Affer Approach

Affer introduces a simple mental model:

> **Events happen once. State can be read forever.**

Each browser subsystem is represented by a **Sensor**.

A sensor listens to the browser only once, continuously maintains its internal state, and exposes that state through a consistent API.

Your application never needs to coordinate browser events itself—it simply reads the information it needs whenever it updates.

---

## Core Concepts

Every sensor follows the same principles.

- **Headless** — no rendering, styling, or UI components.
- **Framework agnostic** — works with vanilla JavaScript or any frontend framework.
- **Continuously synchronized** — state stays updated automatically.
- **Composable** — sensors work independently but integrate naturally together.
- **Deterministic** — every system observes the same browser state during an update cycle.

---

## Ecosystem

Affer currently provides sensors and utilities for common browser systems.

| Module | Purpose |
|---------|---------|
| `Mouse` | Pointer position, velocity, buttons, centered coordinates and more. |
| `Keyboard` | Keyboard state, combinations and key sequences. |
| `Touch` | Multi-touch gestures, drags, pinch and rotation. |
| `Scroll` | Scroll position, velocity and progression. |
| `Viewport` | Window dimensions, DPR, orientation and media queries. |
| `VirtualJoystick` | Fully headless touch joystick for mobile interfaces. |
| `Ticker` | Shared frame scheduler with lag smoothing and priorities. |
| `UpdateGroup` | Synchronize multiple updateable objects under a single execution context. |
| `Utilities` | Mathematical helpers and supporting utilities. |

---

## Architecture

A typical application using Affer looks like this:

```text
Browser
      │
      ▼
 Browser Events
      │
      ▼
    Sensors
      │
      ▼
 Continuous State
      │
      ▼
     Ticker
      │
      ▼
 Your Application
```

Sensors observe the browser.

The Ticker synchronizes time.

Your application simply reads state.

---

## Who is Affer for?

Affer is particularly useful for applications that continuously update over time, including:

- Interactive websites
- WebGL projects
- Three.js scenes
- Canvas applications
- Creative coding
- Data visualizations
- Game interfaces
- Custom rendering engines

It can also be used in traditional web applications whenever centralized browser state simplifies application logic.

---

## Next Steps

If you're new to Affer, continue with:

1. **Installation**
2. **Quick Start**
3. **First Sensor**
4. **Philosophy**

These guides introduce the core concepts before exploring each sensor in detail.