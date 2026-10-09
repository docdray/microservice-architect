import { defineConfig } from "@playwright/test";

// Getestet wird der Build in dist/index.html (siehe tests/e2e/helpers.ts) —
// "npm run test:e2e" baut vorher.

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    viewport: { width: 1400, height: 850 },
    acceptDownloads: true,
    // Optional: vorhandenen Chromium verwenden statt "npx playwright install"
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
