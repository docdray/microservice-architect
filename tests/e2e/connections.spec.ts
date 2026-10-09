import { test, expect } from "@playwright/test";
import { openApp, dragConnection, toastText, selectNode, selectConnection, markerTooltip, exportDiagram, settle } from "./helpers";

test.describe("Verbindungen", () => {
  test("Regeln beim Ziehen", async ({ page }) => {
    const errors = await openApp(page);
    // Demo: n1 Web-Frontend, n2 Auth-Service, n3 Order-Service, n4 Order-DB
    expect(await dragConnection(page, "n3", "rest", "n1")).toBe(false);
    expect(await toastText(page)).toContain("REST-Verbindungen zu einem Frontend sind nicht möglich");

    expect(await dragConnection(page, "n3", "event", "n1")).toBe(false);
    expect(await toastText(page)).toContain("Event-Verbindungen mit einem Frontend sind nicht vorgesehen");

    await page.click("#btn-add-frontend");
    expect(await dragConnection(page, "n1", "rest", "n101")).toBe(false);

    await page.click("#btn-add-service");
    await page.locator("#cb-rest").uncheck();
    expect(await dragConnection(page, "n2", "rest", "n102")).toBe(false);
    expect(await toastText(page)).toContain("bietet keine REST-Schnittstelle an");
    expect(await dragConnection(page, "n2", "event", "n102")).toBe(true);

    expect(await dragConnection(page, "n3", "rest", "n2")).toBe(true);
    expect(await dragConnection(page, "n1", "rest", "n4")).toBe(true);
    const d = await exportDiagram(page);
    expect(d.connections.at(-1)).toMatchObject({ type: "db", from: "n1", to: "n4" });
    expect(errors).toEqual([]);
  });

  test("keine doppelten Verbindungen gleichen Typs in dieselbe Richtung", async ({ page }) => {
    await openApp(page);
    expect(await dragConnection(page, "n1", "rest", "n2")).toBe(false);
    expect(await toastText(page)).toBe("Zwischen „Web-Frontend“ und „Auth-Service“ gibt es bereits eine REST-Verbindung in diese Richtung.");
    expect(await dragConnection(page, "n3", "event", "n2")).toBe(false);
    expect(await toastText(page)).toContain("Event-Verbindung");
    expect(await dragConnection(page, "n3", "rest", "n4")).toBe(false);
    expect(await toastText(page)).toContain("Datenbank-Verbindung");
    expect(await dragConnection(page, "n3", "rest", "n2")).toBe(true);
    expect(await dragConnection(page, "n3", "rest", "n2")).toBe(false);
    expect(await dragConnection(page, "n2", "event", "n3")).toBe(true); // Gegenrichtung erlaubt
  });

  test("REST-Schnittstelle lässt sich nur ohne eingehende REST-Verbindungen abschalten", async ({ page }) => {
    await openApp(page);
    await selectNode(page, "n2");
    await expect(page.locator("#cb-rest")).toBeChecked();
    await expect(page.locator("#cb-rest")).toBeDisabled();

    await selectConnection(page, "c1"); // Web-Frontend → Auth-Service (REST)
    await page.click(".del-btn");
    await selectNode(page, "n2");
    await expect(page.locator("#cb-rest")).toBeEnabled();
  });

  test("Löschen ohne Dialog, betroffenes Ziel wird offenes Ende", async ({ page }) => {
    await openApp(page);
    await selectConnection(page, "c3"); // Order-Service → Auth-Service (Event)
    await page.click(".del-btn");
    await settle(page);
    await expect(page.locator("#confirmOverlay")).not.toHaveClass(/show/);
    const d = await exportDiagram(page);
    expect(d.connections.map(c => c.id)).toEqual(["c1", "c2", "c4"]);
    expect(d.nodes.find(n => n.id === "n3")!.events![0]!.targetIds).toEqual(["n2", "n4"]);
    expect(await markerTooltip(page, "open", "n3")).toContain("OrderCreated: keine Verbindung zu „Auth-Service“");
  });
});
