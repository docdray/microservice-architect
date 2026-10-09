import { test, expect } from "@playwright/test";
import { openApp, importDiagram, markerNodes, markerTooltip, selectConnection, selectNode, settle } from "./helpers";

const ev = (id: string, name: string, trigger: string, targetIds: string[]) => ({ id, name, trigger, targetIds });
const svc = (id: string, name: string, x: number, y: number, events: ReturnType<typeof ev>[]) =>
  ({ id, type: "service", name, x, y, offersRest: true, events });

// A ⇄ B Zyklus, C hängt nur dran; Writer ⇄ Store Zyklus über die Datenbank-Antwort
const small = {
  nodes: [
    svc("a", "Service-A", -300, -150, [ev("e1", "Ping", "Pong", ["b"]), ev("e5", "Start", "__button__", ["c"])]),
    svc("b", "Service-B", 0, -150, [ev("e2", "Pong", "Ping", ["a", "c"])]),
    svc("c", "Service-C", 300, -150, [ev("e3", "Egal", "Pong", [])]),
    svc("s1", "Writer", -300, 120, [ev("e4", "Save", "Saved", ["db"])]),
    { id: "db", type: "database", name: "Store", x: 0, y: 120, events: [ev("e6", "Saved", "Save", [])] },
  ],
  connections: [
    { id: "c1", type: "event", from: "a", to: "b" }, { id: "c2", type: "event", from: "b", to: "a" },
    { id: "c3", type: "event", from: "b", to: "c" }, { id: "c4", type: "event", from: "a", to: "c" },
    { id: "c5", type: "db", from: "s1", to: "db" },
  ],
};

test.describe("Zyklus-Erkennung", () => {
  test("Beispieldiagramm hat keinen Zyklus", async ({ page }) => {
    await openApp(page);
    expect(await markerNodes(page, "cycle")).toEqual([]);
  });

  test("Zyklen werden markiert, Tooltip beginnt beim Element, Kreise glühen", async ({ page }) => {
    const errors = await openApp(page);
    await importDiagram(page, small);
    expect(await markerNodes(page, "cycle")).toEqual(["a", "b", "db", "s1"]);

    await page.locator('.cycle-marker[data-node="b"]').hover();
    await expect(page.locator("#cycle-tooltip")).toHaveText(/Zyklus erkannt\s*Service-B: Pong → Service-A\s*Service-A: Ping → Service-B/);
    const glowing = await page.locator(".cycle-glow").evaluateAll(els => els.map(e => (e as HTMLElement).dataset.node).sort());
    expect(glowing).toEqual(["a", "b"]);

    expect(await markerTooltip(page, "cycle", "db")).toMatch(/Store: Saved → Writer\s*Writer: Save → Store/);
    expect(errors).toEqual([]);
  });

  test("Markierung reagiert sofort auf Änderungen", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, small);
    await selectConnection(page, "c2");
    await page.keyboard.press("Delete");
    await settle(page);
    expect(await markerNodes(page, "cycle")).toEqual(["db", "s1"]);

    await selectNode(page, "s1");
    await page.locator(".event-trigger-select").first().selectOption("__button__");
    await settle(page);
    expect(await markerNodes(page, "cycle")).toEqual([]);
  });

  test("lange Zyklen zeigen höchstens 10 Schritte", async ({ page }) => {
    await openApp(page);
    const ring = { nodes: [] as unknown[], connections: [] as unknown[] };
    for (let i = 0; i < 12; i++) {
      const next = (i + 1) % 12;
      ring.nodes.push(svc("r" + i, "Ring-" + i, Math.cos(i / 12 * 6.28) * 350, Math.sin(i / 12 * 6.28) * 250,
        [ev("re" + i, "E" + i, "E" + ((i + 11) % 12), ["r" + next])]));
      ring.connections.push({ id: "rc" + i, type: "event", from: "r" + i, to: "r" + next });
    }
    await importDiagram(page, ring);
    expect(await markerNodes(page, "cycle")).toHaveLength(12);
    const text = await markerTooltip(page, "cycle", "r3");
    expect(text).toMatch(/^.*Zyklus erkannt\s*Ring-3: E3 → Ring-4/);
    expect(text).toContain("… und 2 weitere Events");
  });
});
