import { describe, expect, it } from "vitest";
import { connectionRuleError, duplicateConnectionError, resolveConnType } from "../../src/lib/model/rules";
import { conn, diagram, node } from "./helpers";

const svc = node("s", "service");
const svcNoRest = node("x", "service", [], { offersRest: false, name: "OhneRest" });
const fe = node("f", "frontend");
const db = node("d", "database");

describe("resolveConnType", () => {
  it("REST-Anfasser auf Datenbank ergibt DB-Verbindung", () => {
    expect(resolveConnType("rest", db)).toBe("db");
    expect(resolveConnType("rest", svc)).toBe("rest");
    expect(resolveConnType("event", svc)).toBe("event");
  });
});

describe("connectionRuleError", () => {
  it.each([
    [svc, fe, "rest", "REST-Verbindungen zu einem Frontend"],
    [fe, fe, "rest", "REST-Verbindungen zu einem Frontend"],
    [svc, svcNoRest, "rest", "„OhneRest“ bietet keine REST-Schnittstelle an"],
    [svc, db, "rest", "müssen vom Typ „db“ sein"],
    [svc, fe, "event", "Event-Verbindungen mit einem Frontend"],
    [fe, svc, "event", "Event-Verbindungen mit einem Frontend"],
    [svc, db, "event", "Event-Verbindungen zu Datenbanken"],
    [db, svc, "rest", "Datenbanken können keine Verbindung aufbauen"],
    [svc, svc, "db", "müssen zu einer Datenbank führen"],
  ] as const)("%s → %s (%s) wird abgelehnt", (a, b, type, msg) => {
    expect(connectionRuleError(a, b, type)).toContain(msg);
  });

  it.each([
    [svc, svc, "rest"], [fe, svc, "rest"], [svc, svcNoRest, "event"], [svc, db, "db"], [fe, db, "db"],
  ] as const)("%s → %s (%s) ist erlaubt", (a, b, type) => {
    expect(connectionRuleError(a, b, type)).toBeNull();
  });
});

describe("duplicateConnectionError", () => {
  const a = node("a", "service"), b = node("b", "service");
  const d = diagram([a, b], [conn("c1", "rest", "a", "b")]);
  it("gleicher Typ, gleiche Richtung ist doppelt", () => {
    expect(duplicateConnectionError(d, a, b, "rest")).toBe("Zwischen „A“ und „B“ gibt es bereits eine REST-Verbindung in diese Richtung.");
  });
  it("Gegenrichtung und anderer Typ sind erlaubt", () => {
    expect(duplicateConnectionError(d, b, a, "rest")).toBeNull();
    expect(duplicateConnectionError(d, a, b, "event")).toBeNull();
  });
});
