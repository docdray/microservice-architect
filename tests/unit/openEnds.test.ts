import { describe, expect, it } from "vitest";
import { buildEventGraph } from "../../src/lib/model/eventGraph";
import { computeOpenEnds, openEndText } from "../../src/lib/model/openEnds";
import { createDemoDiagram } from "../../src/lib/model/diagram";
import { conn, diagram, ev, node } from "./helpers";

const openEnds = (d: ReturnType<typeof diagram>) => {
  const result = computeOpenEnds(d, buildEventGraph(d));
  return Object.fromEntries([...result].map(([id, items]) => [id, items.map(i => i.ev.name + ": " + openEndText(i))]));
};

describe("Offene Enden", () => {
  it("Beispieldiagramm hat keine", () => {
    expect(openEnds(createDemoDiagram())).toEqual({});
  });

  it("alle Arten werden erkannt", () => {
    const d = diagram([
      node("a", "service", [ev("e1", "Go", "__button__", ["b", "c", "weg"])], { name: "A" }),
      node("b", "service", [ev("e2", "Hört", "Go"), ev("e3", "Nie", "Gibts"), ev("e4", "NichtHier", "Klick")], { name: "B" }),
      node("c", "service", [], { name: "C" }),
      node("f", "frontend", [ev("e5", "Klick", "__button__", ["a"])], { name: "FE" }),
      node("d", "database", [ev("e6", "Leer", "")], { name: "DB" }),
    ], [conn("c1", "event", "a", "b"), conn("c2", "rest", "f", "a")], { weg: "Alter Service" });
    expect(openEnds(d)).toEqual({
      a: ["Go: keine Verbindung zu „C“", "Go: Ziel „Alter Service“ wurde gelöscht"],
      b: ["Nie: Trigger „Gibts“: kein Event mit diesem Namen", "NichtHier: Trigger „Klick“: wird nicht an dieses Element gesendet"],
    });
  });

  it("Antwortweg über eingehende REST-Verbindung gilt als erreichbar", () => {
    const d = diagram([
      node("a", "service"),
      node("b", "service", [ev("e1", "Antwort", "__button__", ["a"])]),
    ], [conn("c1", "rest", "a", "b")]);
    expect(openEnds(d)).toEqual({});
  });

  it("gelöschtes Element ohne gemerkten Namen zeigt die ID", () => {
    const d = diagram([node("a", "service", [ev("e1", "Go", "__button__", ["n9"])])]);
    expect(openEnds(d)).toEqual({ a: ["Go: Ziel „n9“ wurde gelöscht"] });
  });
});
