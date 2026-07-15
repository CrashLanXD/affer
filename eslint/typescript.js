import tseslint from "typescript-eslint";

export default [
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{ts,tsx,mts,cts}"],

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
