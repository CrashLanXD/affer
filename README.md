# Zyphora.js Monorepo 🌀

Welcome to the official repository of **Zyphora.js**, a high-performance input-capture engine designed for creative coding, fluid interactions, and zero-layout-thrashing animations.

This repository is managed as a Monorepo using **pnpm workspaces**.

🌐 **Live Documentation & Demos:** [zyphora.clxd.dev](https://zyphora.clxd.dev)

---

## 📁 Repository Structure

```text
zyphora.js/
├── apps/
│   └── docs/            # Astro 6 + Tailwind CSS documentation website
├── packages/
│   └── core/            # Main Zyphora library source code (TypeScript + Vite)
├── .npmrc.example       # Authentication template for private packages
├── package.json         # Root orchestration package
└── pnpm-workspace.yaml

```

---

## 🛠️ Local Development Setup

### 1. Prerequisites

Ensure you have **Node.js ($\ge$ 22.12.0)** and **pnpm** installed globally on your machine.

### 2. Private Package Authentication (`.npmrc`)

This project relies on a private package registry hosted via GitHub Packages. To install dependencies successfully, you must configure your local environment credentials:

1. Copy the template file in the root directory:

```bash
cp .npmrc.example .npmrc

```

2. Open your newly created `.npmrc` file and replace `${GITHUB_TOKEN}` with your personal **GitHub Classic Access Token** (with `read:packages` permissions).

> ⚠️ **Note:** The `.npmrc` file contains sensitive credentials and is automatically ignored by Git via `.gitignore`. Never commit it.

### 3. Installation

Install all workspaces dependencies simultaneously from the root folder:

```bash
pnpm install

```

---

## 🚀 CLI Commands

Run these scripts from the repository root using your terminal:

### Start Development Server

Launches the Astro documentation website with hot module reloading (HMR). It automatically tracks changes made in the core library workspace in real-time.

```bash
pnpm dev

```

### Build the Core Library

Compiles the TypeScript source files inside `packages/core` into optimized, production-ready ES Modules (`dist/index.js`).

```bash
pnpm build:core

```

### Build the Documentation Website

Compiles the Astro application into a highly-optimized static layout ready for Cloudflare Pages deployment.

```bash
pnpm build:docs

```

### Production Build (All)

Compiles both the core library and the documentation sequence seamlessly.

```bash
pnpm build

```

---

## 📜 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.