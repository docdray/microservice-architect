import { test, expect } from "@playwright/test";
import { openApp, importDiagram, markerNodes, markerTooltip, selectNode, dragConnection, exportDiagram, toastText, settle, clickEmptyCanvas } from "./helpers";

const ev = (id: string, name: string, trigger: string, targetIds: string[]) => ({ id, name, trigger, targetIds });

// Enthält alle Arten offener Enden
const diagram = {
  nodes: [
    { id: "a", type: "service", name: "A", x: -250, y: -100, offersRest: true, events: [ev("e1", "Go", "__button__", ["b", "c", "weg"])] },
    { id: "b", type: "service", name: "B", x: 150, y: -100, events: [ev("e2", "Hört", "Go", []), ev("e3", "Nie", "Gibts", []), ev("e4", "NichtHier", "Klick", [])] },
    { id: "c", type: "service", name: "C", x: 150, y: 150, events: [] },
    { id: "f", type: "frontend", name: "FE", x: -550, y: -100, events: [ev("e5", "Klick", "__button__", ["a"])] },
    { id: "d", type: "database", name: "DB", x: -250, y: 150, events: [ev("e6", "Leer", "", [])] },
  ],
  connections: [{ id: "c1", type: "event", from: "a", to: "b" }, { id: "c2", type: "rest", from: "f", to: "a" }],
  deletedNodes: { weg: "Alter Service" },
};

test.describe("Offene Enden", () => {
  test("Beispieldiagramm hat keine offenen Enden", async ({ page }) => {
    await openApp(page);
    expect(await markerNodes(page, "open")).toEqual([]);
  });

  test("alle Arten werden erkannt und beschrieben", async ({ page }) => {
    const errors = await openApp(page);
    await importDiagram(page, diagram);
    expect(await markerNodes(page, "open")).toEqual(["a", "b"]);
    const a = await markerTooltip(page, "open", "a");
    expect(a).toContain("Go: keine Verbindung zu „C“");
    expect(a).toContain("Go: Ziel „Alter Service“ wurde gelöscht");
    const b = await markerTooltip(page, "open", "b");
    expect(b).toContain("Nie: Trigger „Gibts“: kein Event mit diesem Namen");
    expect(b).toContain("NichtHier: Trigger „Klick“: wird nicht an dieses Element gesendet");
    expect(b).not.toContain("Hört");
    expect(errors).toEqual([]);
  });

  test("Seitenleiste zeigt offene Ziele und Trigger-Hinweise", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, diagram);
    await selectNode(page, "b");
    await expect(page.locator("#sb-content .warn-text:visible")).toHaveText([
      "⚠ Trigger „Gibts“: kein Event mit diesem Namen",
      "⚠ Trigger „Klick“: wird nicht an dieses Element gesendet",
    ]);
    await selectNode(page, "a");
    await expect(page.locator(".target-dropdown-btn")).toHaveText("3 Ziele ausgewählt (⚠ 2 offen)");
    await page.click(".target-dropdown-btn");
    await expect(page.locator(".target-dd-row")).toHaveText(["B", "FE (Antwort ← REST)", "⚠ C (keine Verbindung)", "⚠ gelöscht: Alter Service"]);

    // Abhaken entfernt das offene Ziel, Strg+Z holt es zurück
    await page.locator(".target-dd-row.open", { hasText: "gelöscht" }).locator("input").uncheck();
    await page.click(".target-dropdown-btn");
    expect(await markerTooltip(page, "open", "a")).not.toContain("Alter Service");
    await clickEmptyCanvas(page);
    await page.keyboard.press("ControlOrMeta+z");
    await settle(page);
    expect(await markerTooltip(page, "open", "a")).toContain("Alter Service");
  });

  test("Verbindung ziehen schließt offenes Ende", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, diagram);
    expect(await dragConnection(page, "a", "event", "c")).toBe(true);
    expect(await markerTooltip(page, "open", "a")).not.toContain("keine Verbindung");
  });

  test("Simulation überspringt offene Ziele mit Hinweis", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, diagram);
    await selectNode(page, "a");
    await page.click(".ev-start");
    expect(await toastText(page)).toBe("Event „Go“: nicht erreichbar und übersprungen: C, Alter Service (gelöscht)");
    await page.click("#btn-sim-stop");
  });

  test("Export enthält Namen gelöschter, noch referenzierter Elemente", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, diagram);
    expect((await exportDiagram(page)).deletedNodes).toEqual({ weg: "Alter Service" });
  });
});
