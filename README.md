# Affer 🧠

> **A deterministic browser perception ecosystem for real-time web applications.**
>
> *Perceive the browser as a continuous world, not a stream of events.*

Affer is an ecosystem of headless browser perception modules that transform asynchronous browser events into continuously readable state.

Affer provides reusable trackers that synchronize browser information under a shared update cycle, making interaction logic deterministic, composable, and framework agnostic.

> This repository contains the source code for the Affer ecosystem.

---

## Philosophy

Modern interactive applications update every frame.

Browsers, however, communicate through asynchronous events.

Affer bridges that gap by exposing browser information as continuous state that can be queried whenever your application updates.

Instead of asking:

> *"Did a mousemove event happen?"*

you ask:

> *"Where is the pointer right now?"*

This philosophy applies consistently across every perception module.

---

## Repository

This repository is organized as a pnpm workspace.

```text
apps/
└── docs/           Documentation website

packages/
└── affer/          Main npm package

```

Current package:

| Package | Description |
|----------|-------------|
| `@clxd/affer` | Core browser perception library |

Additional packages may be added as the ecosystem evolves.

---

## Development

Install dependencies:

```bash
pnpm install
```

Start the documentation website:

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

Complete documentation, API reference, architecture guides, and interactive examples are available at:

**https://affer.clxd.dev**

---

## Project Status

Affer is currently in **early alpha**.

The public API is still evolving and breaking changes may occur before the first stable release.

Feedback and experimentation are welcome.

---

## License

MIT © clxd.dev