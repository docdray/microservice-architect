import { test, expect } from "@playwright/test";
import { openApp, selectNode, importDiagram, settle } from "./helpers";

/* Entf/Backspace löscht das ausgewählte Element bzw. die Verbindung — aber nur, wenn die
   Taste nicht für ein Bedienelement der Seitenleiste oder einen Dialog gedacht ist. */
test.describe("Entf / Backspace", () => {
  test("löscht das im Diagramm ausgewählte Element", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await page.keyboard.press("Delete");
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveCount(0);
  });

  test("löscht auch ein frisch über die Toolbar angelegtes Element", async ({ page }) => {
    await openApp(page);
    await page.click("#btn-add-service");
    await expect(page.locator("g.node-shape")).toHaveCount(5);
    await page.keyboard.press("Delete");
    await expect(page.locator("g.node-shape")).toHaveCount(4);
  });

  for (const key of ["Delete", "Backspace"]) {
    test(`${key} nach Klick auf einen Button der Seitenleiste löscht nichts`, async ({ page }) => {
      await openApp(page);
      await selectNode(page, "n3");
      await page.click(".add-event-btn");
      await page.keyboard.press(key);
      await settle(page);
      await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveCount(1);
    });

    test(`${key} in der Trigger-Auswahl löscht nichts`, async ({ page }) => {
      await openApp(page);
      await selectNode(page, "n3");
      await page.locator(".event-trigger-select").first().focus();
      await page.keyboard.press(key);
      await settle(page);
      await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveCount(1);
    });

    test(`${key} bei offenem Fehlerdialog löscht nichts`, async ({ page }) => {
      await openApp(page);
      await selectNode(page, "n3");
      await importDiagram(page, "{kaputt");
      await expect(page.locator("#errorOverlay")).toHaveClass(/show/);
      await page.keyboard.press(key);
      await settle(page);
      await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveCount(1);
    });
  }

  test("Checkbox im Ziel-Dropdown: Entf löscht nichts", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await page.click(".target-dropdown-btn");
    await page.locator(".target-dd-row input").first().focus();
    await page.keyboard.press("Delete");
    await settle(page);
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveCount(1);
  });
});
