# Affer.js 🌀

> **Headless browser trackers.**
>
> Get browser data, not UI.

Affer.js is a framework-agnostic ecosystem of browser trackers that collect, normalize, synchronize, and expose browser data through a consistent API.

Instead of implementing dozens of event listeners, state managers, and animation loops, Affer provides reusable trackers that work together under a shared update cycle.

**Current version:** `0.0.0-alpha.0`

> This is an early alpha release. APIs may change while the project evolves.

---

## What is Affer?

Affer is not a UI library.

It doesn't render components nor animate anything.

It answers one question:

> **"Where does the data come from?"**

Mouse position.
Keyboard state.
Scroll progress.
Viewport information.
Touch gestures.
Multiple browser windows.

Affer keeps these values updated and ready to use so you can focus on building interactions instead of implementing infrastructure.

---

## Philosophy

Every module follows the same principles:

- Headless (no UI, no CSS)
- Framework agnostic
- Tree-shakeable
- Real-time updates
- Shared architecture
- Consistent APIs
- Optional modules

Every tracker:

- has state
- exposes `update()`
- can run inside a ticker
- can run inside your own loop
- can be combined with other trackers

---

## Packages

```text
packages/
└── core        → npm package

apps/
└── docs        → documentation website
```

---

## Repository Structure

```text
affer/
├── apps/
│   └── docs/
├── packages/
│   └── core/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## Development

Install dependencies:

```bash
pnpm install
```

Run documentation locally:

```bash
pnpm dev
```

Build everything:

```bash
pnpm build
```

Build only the package:

```bash
pnpm build:core
```

Build only the documentation:

```bash
pnpm build:docs
```

---

## Documentation

Documentation and examples are available at:

https://affer.clxd.dev

---

## License

MIT