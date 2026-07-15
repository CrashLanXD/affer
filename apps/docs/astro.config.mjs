// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { ExpressiveCodeTheme } from "@astrojs/starlight/expressive-code";
import fs from "node:fs";
// TODO: add sidebar addon to starlight

const myThemes = ["omaha", "webrings"].map(
  file => {
    const url = new URL(`./src/themes/${file}.jsonc`, import.meta.url);
    const jsoncString = fs.readFileSync(url, "utf8");
    return ExpressiveCodeTheme.fromJSONString(jsoncString);
  },
);

import tailwindcss from "@tailwindcss/vite";
// import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // adapter: cloudflare()
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    starlight({
      title:       "affer.js",
      description: "Framerate-independent input tracking for high-performance creative coding.",
      social:      [
        {
          icon:  "github",
          label: "GitHub",
          href:  "https://github.com/CrashLanXD/affer",
        },
      ],
      locales: {
        root: {
          label: "English",
          lang:  "en",
        },
      },
      disable404Route: true,
      customCss:       [
        "@/styles/global.css",
        "@/styles/docs/custom.css",
        "@/styles/docs/themes.css",
      ],
      components: {
        ThemeSelect:   "~/docs/ThemeSelect.astro",
        Head:          "~/docs/Head.astro",
        ThemeProvider: "~/ThemeManager.astro",
      },
      expressiveCode: {
        themes:           ["vesper", "one-light", "dracula", ...myThemes],
        themeCssSelector: theme => {
          switch (theme.name) {
            case "one-light": return "[data-theme=\"light\"]";
            case "dracula": return "[data-theme=\"dark\"]";
            case "webrings": return "[data-theme=\"webrings\"]";
            default: return false;
          }
        },
      },
      sidebar: [
        { label: "Overview", link: "/docs/" },
        { label: "Cheat Sheet", link: "/docs/cheatsheet" },
      
        {
          label: "Getting Started",
          items: [
            { label: "Installation", link: "/docs/getting-started/installation" },
            { label: "Quick Start", link: "/docs/getting-started/quick-start" },
            { label: "First Tracker", link: "/docs/getting-started/first-tracker" },
          ],
        },
      
        {
          label: "Concepts",
          items: [
            { label: "Philosophy", link: "/docs/concepts/philosophy" },
            { label: "What are Sensors?", link: "/docs/concepts/what-are-sensors" },
            { label: "Framerate Independence", link: "/docs/concepts/framerate-independence" },
            { label: "Lifecycle Management", link: "/docs/concepts/lifecycle" },
            { label: "Using External Tickers", link: "/docs/concepts/external-ticker" },
          ],
        },

        {
          label: "Core API",
          items: [
            { label: "Ticker", link: "/docs/core/ticker" },
            { label: "Update Group", link: "/docs/core/update-group" },
          ],
        },
      
        {
          label: "Sensors Catalog",
          items: [
            { label: "Introduction", link: "/docs/sensors/" },
            { label: "Mouse", link: "/docs/sensors/mouse" },
            { label: "Keyboard", link: "/docs/sensors/keyboard" },
            { label: "Scroll", link: "/docs/sensors/scroll" },
            { label: "Scroll Section", link: "/docs/sensors/scroll-section" },
            { label: "Touch", link: "/docs/sensors/touch" },
            { label: "Viewport", link: "/docs/sensors/viewport" },
            { label: "Virtual Joystick", link: "/docs/sensors/virtual-joystick" },
          ],
        },
      
        {
          label: "Advanced Guides",
          items: [
            { label: "Window Cluster", link: "/docs/advanced/window-cluster" },
            { label: "Custom Sensors", link: "/docs/advanced/custom-sensors" },
          ],
        },
      
        {
          label: "Utilities & Helpers",
          items: [
            { label: "Math Utils", link: "/docs/utils/math" },
            { label: "Timing & Delays", link: "/docs/utils/timing" },
            { label: "Core Helpers", link: "/docs/utils/helpers" },
          ],
        },
      
        {
          label: "Integration Examples",
          items: [
            { label: "GSAP Synchronization", link: "/docs/examples/gsap" },
            { label: "Three.js Render Loop", link: "/docs/examples/three-js" },
            { label: "WebGL Shaders Reactivity", link: "/docs/examples/shader" },
            { label: "Multiple Trackers Ecosystem", link: "/docs/examples/multiple-trackers" },
          ],
        },
      ],
    }),
  ],
});
