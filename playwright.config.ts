import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

// APP=legacy testet die alte Einzeldatei, sonst den Build in dist/.
// Beide Varianten müssen dieselben Tests bestehen (Verhaltensgleichheit beim Portieren).
const appFile = process.env.APP === "legacy"
  ? path.join(root, "legacy/microservice-architect.html")
  : path.join(root, "dist/index.html");

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "file://" + appFile,
    viewport: { width: 1400, height: 850 },
    acceptDownloads: true,
    // Optional: vorhandenen Chromium verwenden statt "npx playwright install"
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
});
