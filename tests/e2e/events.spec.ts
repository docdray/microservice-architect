import { test, expect } from "@playwright/test";
import { openApp, selectNode, renameEvent, eventsOf, markerNodes, toastText, settle } from "./helpers";

test.describe("Events", () => {
  test("Umbenennen entfernt Leerzeichen am Rand und lässt Trigger stehen", async ({ page }) => {
    const errors = await openApp(page);
    await selectNode(page, "n3");
    await renameEvent(page, 0, "  OrderMade  ");
    const evs = await eventsOf(page);
    expect(evs["OrderMade"]).toBeDefined();
    expect(evs["OrderSaved"]!.trigger).toBe("OrderCreated");
    expect(await markerNodes(page, "open")).toEqual(["n4"]);
    await expect(page.locator(".rename-hint")).toContainText("1 Trigger hört noch auf „OrderCreated“.");
    expect(errors).toEqual([]);
  });

  test("Button „Trigger mit umbenennen“ zieht Trigger nach — auch über mehrere Umbenennungen", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await renameEvent(page, 0, "OrderMade");
    await renameEvent(page, 0, "OrderX");
    await expect(page.locator(".rename-hint")).toContainText("„OrderCreated“");
    await page.click(".rename-hint button");
    await settle(page);
    expect(await toastText(page)).toBe("1 Trigger wurde auf „OrderX“ umbenannt.");
    await expect(page.locator(".rename-hint")).toBeHidden();
    expect((await eventsOf(page))["OrderSaved"]!.trigger).toBe("OrderX");
    expect(await markerNodes(page, "open")).toEqual([]);
  });

  test("Zurückbenennen lässt den Hinweis verschwinden", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await renameEvent(page, 0, "OrderMade");
    await renameEvent(page, 0, "OrderCreated");
    await expect(page.locator(".rename-hint")).toBeHidden();
    expect(await markerNodes(page, "open")).toEqual([]);
  });

  test("leerer Name wird abgelehnt", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await renameEvent(page, 0, "   ");
    expect(await toastText(page)).toBe("Der Event-Name darf nicht leer sein.");
    await expect(page.locator(".event-name-input").first()).toHaveValue("OrderCreated");
  });

  test("Trigger-Auswahl enthält keine Events des eigenen Elements", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n2");
    await page.click(".add-event-btn");
    await renameEvent(page, 0, "Altes Event");
    await page.click(".add-event-btn");
    const options = await page.locator(".event-trigger-select").nth(1).locator("option").allTextContents();
    expect(options).toEqual(["Nur Button (manuell)", "BestellungAbsenden", "OrderCreated", "OrderSaved", "+ Neuer Trigger …"]);

    await selectNode(page, "n3");
    const options3 = await page.locator(".event-trigger-select").first().locator("option").allTextContents();
    expect(options3).toContain("Altes Event");
    expect(options3).not.toContain("OrderCreated");
  });
});
