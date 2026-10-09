import { describe, expect, it } from "vitest";
import { buildEventGraph, cyclePathFrom, detectCycles } from "../../src/lib/model/eventGraph";
import { createDemoDiagram } from "../../src/lib/model/diagram";
import { conn, diagram, ev, node } from "./helpers";

const pathText = (d: ReturnType<typeof diagram>, nodeId: string) => {
  const cycles = detectCycles(buildEventGraph(d)).filter(c => c.nodeIds.has(nodeId));
  return cycles.map(c => cyclePathFrom(c, nodeId).map(s => `${s.from.node.id}:${s.from.ev.name}→${s.to.node.id}`));
};

describe("Zyklus-Erkennung", () => {
  it("Beispieldiagramm hat keinen Zyklus", () => {
    expect(detectCycles(buildEventGraph(createDemoDiagram()))).toEqual([]);
  });

  it("A ⇄ B wird erkannt, C ist nicht Teil davon", () => {
    const d = diagram([
      node("a", "service", [ev("e1", "Ping", "Pong", ["b"])]),
      node("b", "service", [ev("e2", "Pong", "Ping", ["a", "c"])]),
      node("c", "service", [ev("e3", "Egal", "Pong")]),
    ], [conn("c1", "event", "a", "b"), conn("c2", "event", "b", "a"), conn("c3", "event", "b", "c")]);
    const cycles = detectCycles(buildEventGraph(d));
    expect(cycles).toHaveLength(1);
    expect([...cycles[0]!.nodeIds].sort()).toEqual(["a", "b"]);
    expect(pathText(d, "b")).toEqual([["b:Pong→a", "a:Ping→b"]]);
  });

  it("ohne Weg zum Ziel entsteht kein Zyklus", () => {
    const d = diagram([
      node("a", "service", [ev("e1", "Ping", "Pong", ["b"])]),
      node("b", "service", [ev("e2", "Pong", "Ping", ["a"])]),
    ], [conn("c1", "event", "a", "b")]);
    expect(detectCycles(buildEventGraph(d))).toEqual([]);
  });

  it("Datenbank-Antwort an den Absender schließt einen Zyklus", () => {
    const d = diagram([
      node("w", "service", [ev("e1", "Save", "Saved", ["db"])]),
      node("db", "database", [ev("e2", "Saved", "Save")]),
    ], [conn("c1", "db", "w", "db")]);
    expect(pathText(d, "db")).toEqual([["db:Saved→w", "w:Save→db"]]);
  });

  it("Pfad beginnt beim gefragten Element", () => {
    const n = 12;
    const nodes = Array.from({ length: n }, (_, i) =>
      node("r" + i, "service", [ev("e" + i, "E" + i, "E" + ((i + n - 1) % n), ["r" + ((i + 1) % n)])]));
    const conns = Array.from({ length: n }, (_, i) => conn("c" + i, "event", "r" + i, "r" + ((i + 1) % n)));
    const path = pathText(diagram(nodes, conns), "r3")[0]!;
    expect(path).toHaveLength(12);
    expect(path[0]).toBe("r3:E3→r4");
    expect(path[11]).toBe("r2:E2→r3");
  });
});
