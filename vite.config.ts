import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { viteSingleFile } from "vite-plugin-singlefile";

// Ergebnis ist eine einzige HTML-Datei (JS und CSS eingebettet), die sich ohne Server
// direkt im Browser öffnen lässt.
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
