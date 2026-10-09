import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/* Die Tests stützen sich ausschließlich auf stabile Selektoren (IDs, Klassen,
   data-Attribute) und den JSON-Export — nicht auf interne Strukturen der Komponenten. */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const APP_URL = "file://" + path.join(root, "dist/index.html");

export type Diagram = {
  nodes: Array<{
    id: string; type: string; name: string; x: number; y: number;
    offersRest?: boolean; description?: string;
    events?: Array<{ id: string; name: string; trigger: string; targetIds?: string[] }>;
  }>;
  connections: Array<{ id: string; type: string; from: string; to: string; description?: string; websocket?: boolean }>;
  deletedNodes?: Record<string, string>;
};

export async function openApp(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(APP_URL);
  await expect(page.locator("g.node-shape").first()).toBeVisible();
  return errors;
}

/* Kurze Pause, damit verzögerte Aktionen (z. B. Rückgängig-Erfassung) abgeschlossen sind. */
export const settle = (page: Page) => page.waitForTimeout(50);

export async function selectNode(page: Page, id: string) {
  const c = await center(page, `g.node-shape[data-id="${id}"] .node-rect`);
  await page.mouse.click(c.x, c.y);
  await expect(page.locator("#sidebar")).toHaveClass(/show/);
}

export async function selectConnection(page: Page, id: string) {
  // Direkt auslösen: Trefferflächen paralleler Verbindungen können sich überlagern.
  await page.locator(`g.conn[data-id="${id}"] .conn-hit`).dispatchEvent("click");
  await expect(page.locator("#sidebar")).toHaveClass(/show/);
}

export async function clickEmptyCanvas(page: Page) {
  await page.mouse.click(700, 820);
  await settle(page);
}

async function center(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error("Nicht sichtbar: " + selector);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/* Zieht eine Verbindung vom Anfasser (R/E) eines Elements auf ein anderes Element.
   Liefert true, wenn eine Verbindung entstanden ist. */
export async function dragConnection(page: Page, fromId: string, type: "rest" | "event", toId: string) {
  const before = await page.locator("g.conn").count();
  const a = await center(page, `g.handle[data-node="${fromId}"][data-conntype="${type}"]`);
  const t = await center(page, `g.node-shape[data-id="${toId}"] .node-rect`);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(t.x, t.y, { steps: 5 });
  await page.mouse.up();
  await settle(page);
  return (await page.locator("g.conn").count()) > before;
}

/* Zieht ein Element in kleinen Schritten um dx Bildschirmpixel nach rechts. */
export async function dragNode(page: Page, id: string, dx: number, stepPx: number) {
  const c = await center(page, `g.node-shape[data-id="${id}"] .node-rect`);
  await page.mouse.move(c.x, c.y);
  await page.mouse.down();
  for (let moved = stepPx; moved <= dx; moved += stepPx) await page.mouse.move(c.x + moved, c.y);
  await page.mouse.up();
  await settle(page);
}

export async function exportDiagram(page: Page): Promise<Diagram> {
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#btn-export")]);
  return JSON.parse(readFileSync((await download.path())!, "utf8"));
}

export async function importDiagram(page: Page, data: unknown, name = "import.json") {
  const text = typeof data === "string" ? data : JSON.stringify(data);
  await page.setInputFiles("#file-import", { name, mimeType: "application/json", buffer: Buffer.from(text) });
  await page.waitForTimeout(150);
}

export function fixture(name: string) {
  return JSON.parse(readFileSync(path.join(root, "tests/fixtures", name), "utf8"));
}

export async function toastText(page: Page) {
  const toast = page.locator("#hint-toast");
  return (await toast.isVisible()) ? (await toast.textContent()) ?? "" : "";
}

export async function errorDialogItems(page: Page) {
  if (!(await page.locator("#errorOverlay").evaluate(e => e.classList.contains("show")))) return null;
  return page.locator("#errorList li").allTextContents();
}

/* Text des Tooltips eines Markers ("cycle" = Zyklus, "open" = offene Enden). */
export async function markerTooltip(page: Page, kind: "cycle" | "open", nodeId: string) {
  await page.mouse.move(5, 5);
  await page.locator(`.${kind}-marker[data-node="${nodeId}"]`).hover();
  await expect(page.locator("#cycle-tooltip")).toHaveClass(/show/);
  const text = await page.locator("#cycle-tooltip").innerText();
  await page.mouse.move(5, 5);
  return text;
}

export async function markerNodes(page: Page, kind: "cycle" | "open") {
  return page.locator(`.${kind}-marker`).evaluateAll(els => els.map(e => (e as HTMLElement).dataset.node).sort());
}

/* Benennt das idx-te Event des ausgewählten Elements um und schließt die Eingabe mit Enter ab. */
export async function renameEvent(page: Page, idx: number, name: string) {
  const input = page.locator(".event-name-input").nth(idx);
  await input.click();
  await page.waitForTimeout(50);
  await input.press("ControlOrMeta+a");
  await input.pressSequentially(name);
  await input.press("Enter");
  await settle(page);
}

export async function eventsOf(page: Page) {
  const d = await exportDiagram(page);
  return Object.fromEntries(d.nodes.flatMap(n => (n.events ?? []).map(e => [e.name, { node: n.id, trigger: e.trigger, targets: e.targetIds ?? [] }])));
}

export async function undoRedoState(page: Page) {
  return {
    undo: await page.locator("#btn-undo").isEnabled(),
    redo: await page.locator("#btn-redo").isEnabled(),
  };
}
