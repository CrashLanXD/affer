---
title: Overview
description: Framerate-independent input tracking for high-performance creative coding.
---

**@clxd/affer** is a bare-metal, zero-dependency library designed to capture, process, and synchronize sensory data streams (mouse, keyboard, scroll, viewport, and window telemetry) in high-refresh-rate interactive web applications.

Inspired by **afferent neurons** this tool acts as the peripheral nervous system for your Canvas, WebGL, or mathematical simulation loops.

## Why affer?

* **Framerate Independence:** Core math utilities and contextual interpolations are driven by Delta Time (`dt`). This guarantees your animations and trackers move at the exact same physical speed on 60Hz, 120Hz, or 144Hz displays.

* **Zero Garbage Collection Overhead (Zero-GC):** Made specifically for high-performance execution loops (`requestAnimationFrame`). It avoids instantiating ephemeral objects inside the tick callback, keeping the browser's garbage collector at peace.

* **Pure Tree-Shakable Architecture:** Packed with a strict `"sideEffects": false` configuration. Your bundler can safely discard unused trackers, ensuring you only pay a file-weight penalty for the exact features you import.