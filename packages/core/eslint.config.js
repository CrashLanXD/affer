import globals from "globals";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["node_modules", "dist", "build", ".astro", "out", "target"],
  },
  ...tseslint.configs.recommended,
  {
    files:           ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals:       { ...globals.browser, ...globals.node, ...globals.es2021 },
      parser:        tseslint.parser,
      parserOptions: {
        project: false,
        program: null,
      },
    },
    plugins: { "@stylistic": stylistic },
    rules:   {
      "no-unused-vars":                    "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
      }],

      "no-var":       "error",
      "prefer-const": "error",

      "@typescript-eslint/no-explicit-any":       "off",
      "@typescript-eslint/no-inferrable-types":   "off",
      "no-unused-expressions":                    "off",
      "@typescript-eslint/no-unused-expressions": "off",

      "@stylistic/key-spacing":     ["error", { "align": "value", "beforeColon": false, "afterColon": true }],
      "@stylistic/no-multi-spaces": ["off"],

      // indent
      "@stylistic/indent": ["error", 2, {
        "SwitchCase":         1,
        "VariableDeclarator": "first",
      }],
      "@stylistic/indent-binary-ops": ["error", 2],

      "@stylistic/semi":                 ["error", "always"],
      "@stylistic/quotes":               ["error", "double"],
      "@stylistic/jsx-quotes":           ["error", "prefer-double"],
      "@stylistic/comma-dangle":         ["error", "always-multiline"],
      // "@stylistic/type-annotation-spacing": ["error", { "before": false, "after": true }],
      "@stylistic/eol-last":             ["error", "always"],
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/arrow-spacing":        ["error", { "before": true, "after": true }],
      "@stylistic/padded-blocks":        ["error", { "blocks": "never", "classes": "always" }],

      // Comments
      // "@stylistic/multiline-comment-style": ["error", "starred-block"],
      // "@stylistic/spaced-comment":          ["error", "always", { "exceptions": ["-", "+", "*", "#"], "markers": ["/", "!", "?", "#region", "#endregion", "#if", "#endif"] }],

      // misc
      "@stylistic/max-len":                          ["error", { "code": 150, "ignoreComments": true, "ignoreUrls": true, "ignoreRegExpLiterals": true, "ignoreStrings": true, "ignoreTemplateLiterals": true }],
      "@stylistic/max-statements-per-line":          ["error", { "max": 4, "ignoredNodes": ["BreakStatement"] }],
      "@stylistic/member-delimiter-style":           "error",
      "@stylistic/nonblock-statement-body-position": ["error", "any"],

      // exp
      "@stylistic/exp-list-style": ["error", {
        "overrides": {
          "{}": { "singleLine": { "spacing": "always" } },
        },
      }],
    },
  },
]);
