// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { ExpressiveCodeTheme } from '@astrojs/starlight/expressive-code';
import fs from 'node:fs';
// TODO: add sidebar addon to starlight

const myThemes = ["omaha", "webrings"].map(
  file => {
    const url = new URL(`./src/themes/${file}.jsonc`, import.meta.url);
    const jsoncString = fs.readFileSync(url, "utf8");
    return ExpressiveCodeTheme.fromJSONString(jsoncString);
  }
);

import tailwindcss from '@tailwindcss/vite';
// import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  // adapter: cloudflare()
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [starlight({
    title: 'affer.js',
    description: 'Framerate-independent input tracking for high-performance creative coding.',
    locales: {
      root: {
        label: "English",
        lang:  "en",
      }
    },
    customCss: [
      "@/styles/global.css",
      "@/styles/docs/themes.css",
    ],
    components: {
      ThemeSelect: "~/docs/ThemeSelect.astro",
      Head: "~/docs/Head.astro",
      ThemeProvider: "~/ThemeManager.astro",
    },
    expressiveCode: {
      themes: ["vesper", "one-light", "dracula", ...myThemes],
      themeCssSelector: theme => {
        switch (theme.name) {
          case "one-light": return "[data-theme=\"light\"]";
          case "dracula": return "[data-theme=\"dark\"]";
          case "webrings": return "[data-theme=\"webrings\"]";
          default: return false;
        }
      }
    },
    sidebar: [
      { label: 'Home', link: '/docs/' },
      { label: 'examples', link: '/docs/example' },
      {
        label: 'Reference',
        items: [{ autogenerate: { directory: 'docs/guides' } }],
      },
      {
        label: 'Enlaces Externos',
        items: [
          { label: 'Astro', link: 'https://astro.build/' },
        ],
      },
    ],
  })]
});