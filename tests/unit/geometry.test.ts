import { describe, expect, it } from "vitest";
import { edgePoint, findNodeAt, nodeLabel, nodeSize, smallLabelWidth } from "../../src/lib/model/geometry";
import { diagram, node } from "./helpers";

describe("nodeSize / nodeLabel", () => {
  it("kurze Namen behalten die Grundbreite je Typ", () => {
    expect(nodeSize({ type: "service", name: "Order-Service" })).toEqual({ w: 150, h: 64 });
    expect(nodeSize({ type: "database", name: "DB" })).toEqual({ w: 130, h: 74 });
  });

  it("lange Namen machen das Element breiter", () => {
    const name = "Auth-Service test 12345"; // 23 Zeichen
    expect(nodeSize({ type: "service", name }).w).toBe(23 * 8 + 40);
    expect(nodeLabel({ name })).toBe(name);
  });

  it("sehr lange Namen werden auf die Maximalbreite gekürzt", () => {
    const name = "x".repeat(60);
    expect(nodeLabel({ name })).toHaveLength(35);
    expect(nodeLabel({ name }).endsWith("…")).toBe(true);
    expect(nodeSize({ type: "service", name }).w).toBe(320);
  });
});

describe("Geometrie berücksichtigt die Breite", () => {
  it("Kantenpunkt und Trefferprüfung", () => {
    const n = node("a", "service", [], { name: "x".repeat(30), x: 0, y: 0 }); // 280 breit
    expect(edgePoint(n, 1000, 0)).toEqual({ x: 140, y: 0 });
    expect(findNodeAt(diagram([n]), 130, 0)?.id).toBe("a");
    expect(findNodeAt(diagram([n]), 150, 0)).toBeNull();
  });

  it("Label-Breite wächst mit dem Text", () => {
    expect(smallLabelWidth("Login / Token")).toBeCloseTo(13 * 6.4 + 16);
  });
});
