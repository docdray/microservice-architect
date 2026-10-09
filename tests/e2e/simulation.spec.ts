import { test, expect } from "@playwright/test";
import { openApp, selectNode } from "./helpers";

test.describe("Simulation", () => {
  test("Event-Kette des Beispiels läuft vollständig durch", async ({ page }) => {
    const errors = await openApp(page);
    await selectNode(page, "n1");
    await page.click(".ev-start");
    const seen = new Set<string>();
    for (let i = 0; i < 40 && seen.size < 3; i++) {
      (await page.locator(".sim-event-text").allTextContents()).forEach(t => seen.add(t));
      await page.waitForTimeout(100);
    }
    expect([...seen].sort()).toEqual(["BestellungAbsenden", "OrderCreated", "OrderSaved"]);
    await page.click("#btn-sim-stop");
    await expect(page.locator(".sim-event-text")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
});
