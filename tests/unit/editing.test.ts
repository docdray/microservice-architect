import { describe, expect, it } from "vitest";
import { addEvent, addNode, createConnection, deleteNode, orphanedTriggers } from "../../src/lib/model/editing";
import { createDemoDiagram, getNode, IdGenerator } from "../../src/lib/model/diagram";
import { conn, diagram, ev, node } from "./helpers";

describe("IDs", () => {
  it("überspringen vergebene und noch referenzierte IDs", () => {
    // n101 Element, n102 Event-Ziel (gelöscht), n103 in deletedNodes, n104 Verbindung, n105 Event
    const d = diagram(
      [node("n101", "service", [ev("n105", "A", "__button__", ["n102"])])],
      [conn("n104", "event", "n101", "n101")],
      { n103: "Alt" });
    const ids = new IdGenerator();
    expect(ids.next(d, "n")).toBe("n106");
    expect(ids.next(d, "c")).toBe("c107"); // Zähler ist für alle Präfixe gemeinsam
  });
});

describe("addNode / addEvent", () => {
  it("vergibt Namen und Standardwerte je Typ", () => {
    const d = createDemoDiagram();
    const ids = new IdGenerator();
    expect(addNode(d, ids, "service", 1, 2)).toMatchObject({ id: "n101", name: "Neuer Service 3", offersRest: true, x: 1, y: 2 });
    const db = addNode(d, ids, "database", 0, 0);
    expect(db).toMatchObject({ name: "Neue Datenbank 2", offersRest: false });
    expect(addEvent(d, ids, db)).toMatchObject({ name: "Neues Event", trigger: "" });
    expect(addEvent(d, ids, getNode(d, "n2")!)).toMatchObject({ trigger: "__button__" });
  });
});

describe("createConnection", () => {
  it("prüft Regeln und Duplikate und wandelt REST auf Datenbank in DB um", () => {
    const d = createDemoDiagram();
    const ids = new IdGenerator();
    const n = (id: string) => getNode(d, id)!;
    const fe = n("n1"), auth = n("n2"), order = n("n3"), db = n("n4");
    expect(createConnection(d, ids, order, fe, "rest")).toHaveProperty("error");
    expect(createConnection(d, ids, fe, auth, "rest")).toHaveProperty("error"); // existiert schon
    const r = createConnection(d, ids, fe, db, "rest");
    expect("conn" in r && r.conn).toMatchObject({ type: "db", from: "n1", to: "n4" });
  });
});

describe("deleteNode", () => {
  it("entfernt Element und Verbindungen, Ziele bleiben, Name wird gemerkt", () => {
    const d = createDemoDiagram();
    deleteNode(d, "n3");
    expect(d.nodes.map(n => n.id)).toEqual(["n1", "n2", "n4"]);
    expect(d.connections.map(c => c.id)).toEqual(["c1"]);
    expect(getNode(d, "n1")!.events[0]!.targetIds).toEqual(["n3"]);
    expect(d.deletedNodes).toEqual({ n3: "Order-Service" });
  });

  it("merkt sich keine Namen, auf die nichts verweist", () => {
    const d = createDemoDiagram();
    deleteNode(d, "n1");
    expect(d.deletedNodes).toEqual({});
  });
});

describe("orphanedTriggers", () => {
  it("findet Trigger auf den alten Namen", () => {
    const d = createDemoDiagram();
    const created = getNode(d, "n3")!.events[0]!;
    created.name = "OrderMade";
    expect(orphanedTriggers(d, created, "OrderCreated").map(o => o.ev.id)).toEqual(["ev3"]);
    expect(orphanedTriggers(d, created, "OrderMade")).toEqual([]);
  });

  it("ignoriert Trigger, wenn ein anderes Event den alten Namen noch trägt", () => {
    const d = diagram([
      node("a", "service", [ev("e1", "Y", "__button__")]),
      node("b", "service", [ev("e2", "X", "__button__"), ev("e3", "T", "X")]),
    ]);
    expect(orphanedTriggers(d, d.nodes[0]!.events[0]!, "X")).toEqual([]);
  });
});
