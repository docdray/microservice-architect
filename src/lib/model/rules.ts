import { CONN_NAMES, type ConnType, type Diagram, type DiagramNode, type HandleType } from "./types";

/* Verbindungsregeln — gelten beim Ziehen neuer Verbindungen und beim Import. */

/* Ein REST-Anfasser auf eine Datenbank gezogen ergibt eine DB-Verbindung. */
export function resolveConnType(handle: HandleType, target: Pick<DiagramNode, "type">): ConnType {
  return handle === "rest" && target.type === "database" ? "db" : handle;
}

type RuleNode = Pick<DiagramNode, "type" | "name" | "offersRest">;

/* Liefert eine Fehlermeldung oder null, wenn die Verbindung erlaubt ist. */
export function connectionRuleError(source: RuleNode, target: RuleNode, type: ConnType): string | null {
  if (source.type === "database") return "Datenbanken können keine Verbindung aufbauen.";
  if (type === "rest") {
    if (target.type === "frontend") return "REST-Verbindungen zu einem Frontend sind nicht möglich — ein Frontend bietet keine REST-Schnittstelle an.";
    if (target.type === "database") return "Verbindungen zu einer Datenbank müssen vom Typ „db“ sein.";
    if (!target.offersRest) return "„" + target.name + "“ bietet keine REST-Schnittstelle an. Sie lässt sich in der Seitenleiste des Service aktivieren.";
  }
  if (type === "event") {
    if (source.type === "frontend" || target.type === "frontend") return "Event-Verbindungen mit einem Frontend sind nicht vorgesehen.";
    if (target.type === "database") return "Event-Verbindungen zu Datenbanken sind nicht vorgesehen.";
  }
  if (type === "db" && target.type !== "database") return "Datenbank-Verbindungen müssen zu einer Datenbank führen.";
  return null;
}

/* Pro Richtung höchstens eine Verbindung desselben Typs (WebSocket zählt als REST). */
export function duplicateConnectionError(d: Diagram, source: DiagramNode, target: DiagramNode, type: ConnType): string | null {
  if (!d.connections.some(c => c.type === type && c.from === source.id && c.to === target.id)) return null;
  return "Zwischen „" + source.name + "“ und „" + target.name + "“ gibt es bereits eine " + CONN_NAMES[type] + "-Verbindung in diese Richtung.";
}
