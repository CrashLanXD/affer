import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { resolve } from "path";

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true })],
  build:   {
    target: "esnext",
    lib:    {
      entry:    resolve(__dirname, "src/index.ts"),
      name:     "affer",
      formats:  ["es"],
      fileName: "index",
    },
    sourcemap:   true,
    emptyOutDir: true,
  },
});
