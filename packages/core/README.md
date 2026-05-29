# zyphora 🌀

A lightweight, ultra-optimized, and framework-agnostic input tracking library built for creative coding, WebGL/Three.js viewports, and high-performance scroll animations. Zyphora centralizes user actions into a single unified requestAnimationFrame ticker loop, shielding your web applications from layout thrashing, micro-stutters, and expensive DOM reflows.

## ✨ Features

- 🚀 Centralized Ticker: Powered by a single loop to sync multiple heavy event calculations smoothly.

- 🖱️ Advanced Mouse & Touch Tracking: Yields raw pixel data, normalized values [0, 1], and WebGL-friendly centered ranges [-1, 1] with built-in mathematical LERP smoothing.

- 📜 Zero-Layout-Thrashing Scroll: Efficiently caches DOM dimensions and toggles execution cycles using native IntersectionObserver when elements cross the viewport boundaries.

- ⌨️ Smart Keyboard Mapping: Native text inputs exclusion guard, custom key combinations, and multi-key sequence tracking (e.g. Konami code triggers) featuring custom timeouts.

- 🕹️ Creative Mobile Toolset: Seamless swipe direction gesture recognizers and a premium glassmorphic virtual analog joystick module out-of-the-box.

- 🌳 Tree-Shakable & Clean: Built natively using strict TypeScript and modern ES Modules.

## 📦 Installation

Install the package into your web application using your preferred package manager:

```Bash
npm install zyphora # or pnpm add zyphora # or yarn add zyphora 
```

## ⚡ Quick Start

Optimized Smooth Mouse Interaction

```TypeScript
import { MouseTracker } from 'zyphora';

// Initialize tracking with a custom interpolation smoothing factor
const mouse = new MouseTracker({ lerpFactor: 0.08 });

function animate() {
  // Grab standard or smoothed centered coordinates [-1, 1] for shaders/WebGL
  const { x, y } = mouse.lerpCentered;
  
  // Your rendering logic here...
  requestAnimationFrame(animate);
}
```

High-Performance Scroll Section Triggers

```TypeScript
import { ScrollSection } from 'zyphora';

const section = new ScrollSection({
  element: document.querySelector('.trigger-section') as HTMLElement,
  onUpdate: (progress, inView) => {
    console.log(`Scroll progress: ${progress}. Visible on screen: ${inView}`);
    // Safe from Layout Thrashing - 0% CPU consumption while off-screen!
  }
}); 
```

## 🌐 Documentation & Demos

For extensive guide documentation, complete API definitions, and interactive creative examples, visit our portal at zyphora.clxd.dev.

