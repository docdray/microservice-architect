import { describe, expect, it } from "vitest";
import { History } from "../../src/lib/model/history";

describe("History", () => {
  it("erster Stand ist kein Schritt, gleiche Stände werden ignoriert", () => {
    const h = new History();
    expect(h.commit("a")).toBe(false);
    expect(h.commit("a")).toBe(false);
    expect(h.canUndo).toBe(false);
    expect(h.commit("b")).toBe(true);
    expect(h.canUndo).toBe(true);
  });

  it("undo/redo und neue Schritte leeren redo", () => {
    const h = new History();
    h.commit("a"); h.commit("b"); h.commit("c");
    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBe("b");
    h.commit("x");
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBe("b");
  });

  it("begrenzt die Anzahl der Schritte", () => {
    const h = new History(3);
    ["a", "b", "c", "d", "e"].forEach(s => h.commit(s));
    expect([h.undo(), h.undo(), h.undo(), h.undo()]).toEqual(["d", "c", "b", null]);
  });
});
