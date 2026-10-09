import { test, expect } from "@playwright/test";
import { openApp, importDiagram, exportDiagram, errorDialogItems, fixture, settle } from "./helpers";

const demoNames = ["Web-Frontend", "Auth-Service", "Order-Service", "Order-DB"];

test.describe("Import / Export", () => {
  test("ungültiges JSON wird abgelehnt, Diagramm bleibt unverändert", async ({ page }) => {
    const errors = await openApp(page);
    await importDiagram(page, "{nodes: [");
    const items = await errorDialogItems(page);
    expect(items).toHaveLength(1);
    expect(items![0]).toContain("kein gültiges JSON");
    await expect(page.locator("g.node-shape .node-label")).toHaveText(demoNames);
    expect(errors).toEqual([]);
  });

  test("Array statt Objekt wird abgelehnt", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, "[1,2]");
    expect(await errorDialogItems(page)).toEqual(["Die Datei muss ein JSON-Objekt mit „nodes“ und „connections“ enthalten."]);
  });

  test("alle Fehler einer Datei werden gemeldet", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, {
      nodes: [
        { id: "a", type: "queue", name: "Q", x: 0, y: 0 },
        { id: "a", type: "service", name: "S", x: "1", y: 2 },
      ],
      connections: [{ id: "c1", type: "grpc", from: "a", to: "nope" }],
    });
    expect(await errorDialogItems(page)).toEqual([
      "Element 1 („Q“): unbekannter Typ „queue“ (erlaubt: service, frontend, database).",
      "Element 2 („S“): ID „a“ ist mehrfach vergeben.",
      "Element 2 („S“): Position „x“/„y“ fehlt oder ist keine Zahl.",
      "Verbindung 1 („c1“): unbekannter Typ „grpc“ (erlaubt: rest, event, db).",
      "Verbindung 1 („c1“): Ziel-Element „nope“ existiert nicht.",
    ]);
    await page.click("#errorOk");
    await expect(page.locator("g.node-shape .node-label")).toHaveText(demoNames);
  });

  test("Verstöße gegen Verbindungsregeln werden gemeldet", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, {
      nodes: [
        { id: "f", type: "frontend", name: "FE", x: 0, y: 0 },
        { id: "s", type: "service", name: "OhneRest", x: 200, y: 0, offersRest: false },
        { id: "d", type: "database", name: "DB", x: 400, y: 0 },
      ],
      connections: [
        { id: "c1", type: "rest", from: "s", to: "f" },
        { id: "c2", type: "rest", from: "f", to: "s" },
        { id: "c3", type: "event", from: "s", to: "f" },
        { id: "c4", type: "rest", from: "f", to: "d" },
        { id: "c5", type: "db", from: "d", to: "s" },
      ],
    });
    const items = await errorDialogItems(page);
    expect(items).toHaveLength(5);
    expect(items![0]).toContain("REST-Verbindungen zu einem Frontend sind nicht möglich");
    expect(items![1]).toContain("„OhneRest“ bietet keine REST-Schnittstelle an");
    expect(items![2]).toContain("Event-Verbindungen mit einem Frontend sind nicht vorgesehen");
    expect(items![3]).toContain("müssen vom Typ „db“ sein");
    expect(items![4]).toContain("Datenbanken können keine Verbindung aufbauen");
  });

  test("doppelte Verbindungen werden gemeldet", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, fixture("duplicate-connections.json"));
    expect(await errorDialogItems(page)).toEqual(["Verbindung 2 („c2“): doppelte REST-Verbindung von „a“ nach „b“."]);
  });

  test("gültige Datei wird importiert, neue IDs kollidieren nicht", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, { nodes: [{ id: "n101", type: "service", name: "Neu", x: 0, y: 0 }], connections: [] });
    expect(await errorDialogItems(page)).toBeNull();
    await page.click("#btn-add-service");
    await settle(page);
    const ids = await page.locator("g.node-shape").evaluateAll(g => g.map(x => (x as HTMLElement).dataset.id));
    expect(ids).toEqual(["n101", "n102"]);
  });

  test("Ziele auf nicht vorhandene Elemente sind erlaubt (offene Enden)", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, {
      nodes: [{ id: "a", type: "service", name: "A", x: 0, y: 0, events: [{ id: "e1", name: "Go", trigger: "__button__", targetIds: ["weg"] }] }],
      connections: [],
      deletedNodes: { weg: "Alter Service" },
    });
    expect(await errorDialogItems(page)).toBeNull();
  });

  test("Leerzeichen am Rand von Event-Namen und Triggern werden entfernt", async ({ page }) => {
    await openApp(page);
    await importDiagram(page, {
      nodes: [{ id: "a", type: "service", name: "A", x: 0, y: 0, events: [{ id: "e1", name: " Ping ", trigger: " Pong ", targetIds: [] }] }],
      connections: [],
    });
    const d = await exportDiagram(page);
    expect(d.nodes[0]!.events![0]).toMatchObject({ name: "Ping", trigger: "Pong" });
  });

  test("Export lässt sich wieder importieren", async ({ page }) => {
    await openApp(page);
    const exported = await exportDiagram(page);
    await importDiagram(page, exported);
    expect(await errorDialogItems(page)).toBeNull();
    expect(await exportDiagram(page)).toEqual(exported);
  });
});
