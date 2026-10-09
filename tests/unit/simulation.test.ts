import { describe, expect, it } from "vitest";
import { eventsTriggeredBy, planFire, skippedMessage } from "../../src/lib/model/simulation";
import { createDemoDiagram, getNode } from "../../src/lib/model/diagram";
import { conn, diagram, ev, node } from "./helpers";

describe("planFire", () => {
  it("findet Wege, auch rückwärts als Antwort", () => {
    const d = createDemoDiagram();
    const order = getNode(d, "n3")!;
    const plan = planFire(d, order, order.events[0]!, null);
    expect(plan.kind === "fire" && plan.hops.map(h => [h.target.id, h.conn.id, h.reversed])).toEqual([["n2", "c3", false], ["n4", "c4", false]]);

    const db = getNode(d, "n4")!;
    const answer = planFire(d, db, db.events[0]!, "n3");
    expect(answer.kind === "fire" && answer.hops.map(h => [h.target.id, h.conn.id, h.reversed])).toEqual([["n3", "c4", true]]);
  });

  it("Datenbank-Events brauchen einen Absender", () => {
    const d = createDemoDiagram();
    const db = getNode(d, "n4")!;
    expect(planFire(d, db, db.events[0]!, null)).toEqual({ kind: "error", message: 'Event "OrderSaved" kann nur automatisch als Antwort ausgelöst werden.' });
  });

  it("überspringt offene Ziele", () => {
    const d = diagram([
      node("a", "service", [ev("e1", "Go", "__button__", ["b", "c", "weg"])]),
      node("b", "service", [], { name: "B" }), node("c", "service", [], { name: "C" }),
    ], [conn("c1", "event", "a", "b")], { weg: "Alter Service" });
    const plan = planFire(d, d.nodes[0]!, d.nodes[0]!.events[0]!, null);
    expect(plan.kind === "fire" && plan.skipped).toEqual(["C", "Alter Service (gelöscht)"]);
    expect(skippedMessage(d.nodes[0]!.events[0]!, ["C"])).toBe("Event „Go“: nicht erreichbar und übersprungen: C");
  });

  it("Ankunft löst Events mit passendem Trigger aus", () => {
    const n = node("a", "service", [ev("e1", "X", "Ping"), ev("e2", "Y", "Pong"), ev("e3", "Z", "Ping")]);
    expect(eventsTriggeredBy(n, "Ping").map(e => e.id)).toEqual(["e1", "e3"]);
  });
});
