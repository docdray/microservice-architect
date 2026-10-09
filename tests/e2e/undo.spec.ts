import { test, expect } from "@playwright/test";
import { openApp, selectNode, undoRedoState, exportDiagram, importDiagram, dragNode, settle, clickEmptyCanvas } from "./helpers";

test.describe("Rückgängig / Wiederholen", () => {
  test("Auswählen erzeugt keinen Schritt", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n2");
    await clickEmptyCanvas(page);
    expect(await undoRedoState(page)).toEqual({ undo: false, redo: false });
  });

  test("Element hinzufügen, Strg+Z, Strg+Y", async ({ page }) => {
    const errors = await openApp(page);
    await page.click("#btn-add-service");
    await settle(page);
    await expect(page.locator("g.node-shape")).toHaveCount(5);
    await clickEmptyCanvas(page);
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.locator("g.node-shape")).toHaveCount(4);
    expect(await undoRedoState(page)).toEqual({ undo: false, redo: true });
    await page.keyboard.press("ControlOrMeta+y");
    await expect(page.locator("g.node-shape")).toHaveCount(5);
    expect(errors).toEqual([]);
  });

  test("Ziehen ist ein einziger Schritt", async ({ page }) => {
    await openApp(page);
    await dragNode(page, "n3", 120, 3);
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveAttribute("transform", "translate(200,60)");
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.locator('g.node-shape[data-id="n3"]')).toHaveAttribute("transform", "translate(80,60)");
    expect(await undoRedoState(page)).toEqual({ undo: false, redo: true });
  });

  test("Texteingabe ist ein Schritt, Strg+Z im Feld wirkt nur auf den Text", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n2");
    const name = page.locator("#sb-content input[type=text]").first();
    await name.click();
    await page.waitForTimeout(50);
    await name.press("End");
    await name.pressSequentially("-Neu");
    // Strg+Z im Feld ist das Rückgängig des Browsers (nimmt Text zurück), nicht das des Tools.
    // Wie viel Text ein Schritt umfasst, entscheidet der Browser — daher nur: etwas wurde
    // zurückgenommen, das Diagramm folgt dem Feld, und das Tool hat keinen Schritt gemacht.
    await name.press("ControlOrMeta+z");
    await expect(name).not.toHaveValue("Auth-Service-Neu");
    await expect(name).toHaveValue(/^Auth-Service/);
    await expect(page.locator('g.node-shape[data-id="n2"] .node-label')).toHaveText(await name.inputValue());
    expect((await undoRedoState(page)).redo).toBe(false);
    await name.pressSequentially("XY");
    await clickEmptyCanvas(page);
    expect(await undoRedoState(page)).toEqual({ undo: true, redo: false });
    await page.keyboard.press("ControlOrMeta+z");
    await expect(page.locator('g.node-shape[data-id="n2"] .node-label')).toHaveText("Auth-Service");
  });

  test("Rückgängig-Button während der Eingabe nimmt die Eingabe zurück", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n2");
    const name = page.locator("#sb-content input[type=text]").first();
    await name.click();
    await page.waitForTimeout(50);
    await name.press("End");
    await name.pressSequentially("QQ");
    await page.click("#btn-undo");
    await expect(page.locator('g.node-shape[data-id="n2"] .node-label')).toHaveText("Auth-Service");
    await expect(page.locator("#sb-content input[type=text]").first()).toHaveValue("Auth-Service");
    await page.click("#btn-redo");
    await expect(page.locator('g.node-shape[data-id="n2"] .node-label')).toHaveText("Auth-ServiceQQ");
  });

  test("Löschen eines Elements wird vollständig zurückgenommen", async ({ page }) => {
    await openApp(page);
    const before = await exportDiagram(page);
    await selectNode(page, "n3");
    await page.keyboard.press("Delete");
    await settle(page);
    await page.keyboard.press("ControlOrMeta+z");
    await settle(page);
    const after = await exportDiagram(page);
    expect(after.nodes).toEqual(before.nodes);
    expect(after.connections).toEqual(before.connections);
  });

  test("neue Aktion leert Wiederholen", async ({ page }) => {
    await openApp(page);
    await page.click("#btn-add-db");
    await settle(page);
    await page.click("#btn-undo");
    expect((await undoRedoState(page)).redo).toBe(true);
    await page.click("#btn-add-frontend");
    await settle(page);
    expect((await undoRedoState(page)).redo).toBe(false);
  });

  test("Import und „Alles löschen“ lassen sich zurücknehmen", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, { nodes: [{ id: "x", type: "service", name: "Importiert", x: 0, y: 0 }], connections: [] });
    await expect(page.locator("g.node-shape")).toHaveCount(1);
    await page.click("#btn-undo");
    await expect(page.locator("g.node-shape")).toHaveCount(4);
    await page.click("#btn-clear");
    await page.click("#confirmYes");
    await settle(page);
    await expect(page.locator("g.node-shape")).toHaveCount(0);
    await page.click("#btn-undo");
    await expect(page.locator("g.node-shape")).toHaveCount(4);
  });
});
