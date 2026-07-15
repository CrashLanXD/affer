import root from "../../eslint.config.js";
import astro from "eslint-plugin-astro";
import astroRules from "../../eslint/astro.js";

export default [
  ...root,
  ...astro.configs.recommended,
  ...astroRules,
];
