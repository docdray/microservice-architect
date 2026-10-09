import { describe, expect, it } from "vitest";
import { parseImport, serializeDiagram, validateImport } from "../../src/lib/model/importExport";
import { createDemoDiagram } from "../../src/lib/model/diagram";
import duplicate from "../fixtures/duplicate-connections.json";

describe("validateImport", () => {
  it("lehnt Nicht-Objekte ab", () => {
    expect(validateImport([1, 2])).toEqual(["Die Datei muss ein JSON-Objekt mit „nodes“ und „connections“ enthalten."]);
    expect(validateImport({ nodes: [] })).toEqual(["„connections“ fehlt oder ist keine Liste."]);
  });

  it("meldet alle Fehler mit Ort", () => {
    expect(validateImport({
      nodes: [
        { id: "a", type: "queue", name: "Q", x: 0, y: 0 },
        { id: "a", type: "service", name: "S", x: "1", y: 2, offersRest: "ja" },
      ],
      connections: [{ id: "c1", type: "grpc", from: "a", to: "nope" }],
    })).toEqual([
      "Element 1 („Q“): unbekannter Typ „queue“ (erlaubt: service, frontend, database).",
      "Element 2 („S“): ID „a“ ist mehrfach vergeben.",
      "Element 2 („S“): Position „x“/„y“ fehlt oder ist keine Zahl.",
      "Element 2 („S“): „offersRest“ muss vom Typ boolean sein.",
      "Verbindung 1 („c1“): unbekannter Typ „grpc“ (erlaubt: rest, event, db).",
      "Verbindung 1 („c1“): Ziel-Element „nope“ existiert nicht.",
    ]);
  });

  it("meldet doppelte Verbindungen", () => {
    expect(validateImport(duplicate)).toEqual(["Verbindung 2 („c2“): doppelte REST-Verbindung von „a“ nach „b“."]);
  });

  it("erlaubt Ziele auf nicht vorhandene Elemente", () => {
    expect(validateImport({
      nodes: [{ id: "a", type: "service", name: "A", x: 0, y: 0, events: [{ id: "e", name: "Go", trigger: "__button__", targetIds: ["weg"] }] }],
      connections: [],
      deletedNodes: { weg: "Alt" },
    })).toEqual([]);
  });

  it("prüft deletedNodes", () => {
    expect(validateImport({ nodes: [], connections: [], deletedNodes: { a: 1 } }))
      .toEqual(["„deletedNodes“ muss ein Objekt aus ID → Name (Text) sein."]);
  });
});

describe("parseImport", () => {
  it("meldet kaputtes JSON", () => {
    const r = parseImport("{nodes: [");
    expect("errors" in r && r.errors[0]).toMatch(/^Die Datei ist kein gültiges JSON: /);
  });

  it("ergänzt Standardwerte und entfernt Leerzeichen am Rand", () => {
    const r = parseImport(JSON.stringify({
      nodes: [
        { id: "a", type: "service", name: "A", x: 0, y: 0, offersRest: true, events: [{ id: "e", name: " Ping ", trigger: " Pong " }] },
        { id: "f", type: "frontend", name: "F", x: 0, y: 0, offersRest: true },
      ],
      connections: [{ id: "c", type: "rest", from: "f", to: "a" }],
    }));
    expect("diagram" in r).toBe(true);
    if (!("diagram" in r)) return;
    expect(r.diagram.nodes[0]!.events[0]).toEqual({ id: "e", name: "Ping", trigger: "Pong", targetIds: [] });
    expect(r.diagram.nodes[1]).toMatchObject({ offersRest: false, description: "", events: [] });
    expect(r.diagram.connections[0]).toMatchObject({ description: "", websocket: false });
    expect(r.diagram.deletedNodes).toEqual({});
  });

  it("Export lässt sich verlustfrei wieder einlesen", () => {
    const d = createDemoDiagram();
    const r = parseImport(serializeDiagram(d));
    expect("diagram" in r && r.diagram).toEqual(d);
  });
});

describe("serializeDiagram", () => {
  it("behält nur noch referenzierte gelöschte Namen", () => {
    const d = createDemoDiagram();
    d.deletedNodes = { n3: "Order-Service", n9: "Unbenutzt" };
    d.nodes = d.nodes.filter(n => n.id !== "n3");
    expect(JSON.parse(serializeDiagram(d)).deletedNodes).toEqual({ n3: "Order-Service" });
  });
});
