import { test, expect } from "@playwright/test";
import { openApp, selectNode, exportDiagram, markerNodes, markerTooltip, dragNode, settle, clickEmptyCanvas } from "./helpers";

test.describe("Elemente", () => {
  test("Löschen ohne Dialog, Ziele anderer Events bleiben als offene Enden", async ({ page }) => {
    const errors = await openApp(page);
    await selectNode(page, "n3");
    await page.keyboard.press("Delete");
    await settle(page);
    await expect(page.locator("#confirmOverlay")).not.toHaveClass(/show/);

    const d = await exportDiagram(page);
    expect(d.nodes.map(n => n.id)).toEqual(["n1", "n2", "n4"]);
    expect(d.connections.map(c => c.id)).toEqual(["c1"]);
    expect(d.nodes[0]!.events![0]!.targetIds).toEqual(["n3"]);
    expect(d.deletedNodes).toEqual({ n3: "Order-Service" });

    expect(await markerNodes(page, "open")).toEqual(["n1", "n4"]);
    expect(await markerTooltip(page, "open", "n1")).toContain("BestellungAbsenden: Ziel „Order-Service“ wurde gelöscht");
    expect(await markerTooltip(page, "open", "n4")).toContain("OrderSaved: Trigger „OrderCreated“: kein Event mit diesem Namen");
    expect(errors).toEqual([]);
  });

  test("neue Elemente bekommen keine ID eines gelöschten, noch referenzierten Elements", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n3");
    await page.click(".del-btn");
    await page.click("#btn-add-service");
    await settle(page);
    const ids = await page.locator("g.node-shape").evaluateAll(g => g.map(x => (x as HTMLElement).dataset.id));
    expect(ids).not.toContain("n3");
  });

  test("langsames Ziehen verschiebt nur und wählt nicht aus — auch bei Zoom", async ({ page }) => {
    await openApp(page);
    await dragNode(page, "n3", 100, 1);
    await expect(page.locator("#sidebar")).not.toHaveClass(/show/);
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveAttribute("transform", "translate(180,60)");

    await page.reload();
    await page.mouse.move(700, 425);
    for (let i = 0; i < 8; i++) await page.mouse.wheel(0, -300);
    await expect(page.locator("#zoomval")).toHaveText("300%");
    await dragNode(page, "n3", 100, 2);
    await expect(page.locator("#sidebar")).not.toHaveClass(/show/);
  });

  test("Klick mit leichtem Zittern wählt aus und verschiebt nicht", async ({ page }) => {
    await openApp(page);
    await dragNode(page, "n3", 2, 1);
    await expect(page.locator("#sidebar")).toHaveClass(/show/);
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveAttribute("transform", "translate(80,60)");
    await clickEmptyCanvas(page);
  });
});
