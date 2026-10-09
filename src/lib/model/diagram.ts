import type { Connection, Diagram, DiagramNode, NodeType } from "./types";

/* Grundlegende Abfragen auf einem Diagramm. Alle Funktionen sind rein bzw. verändern
   nur das übergebene Diagramm — ohne globalen Zustand. */

export function getNode(d: Diagram, id: string): DiagramNode | undefined {
  return d.nodes.find(n => n.id === id);
}

export function getConnection(d: Diagram, id: string): Connection | undefined {
  return d.connections.find(c => c.id === id);
}

export function emptyDiagram(): Diagram {
  return { nodes: [], connections: [], deletedNodes: {} };
}

export function createDemoDiagram(): Diagram {
  return {
    nodes: [
      { id: "n1", type: "frontend", name: "Web-Frontend", x: -260, y: -40, offersRest: false,
        description: "Single-Page-App im Browser der Kund:innen.",
        events: [{ id: "ev1", name: "BestellungAbsenden", trigger: "__button__", targetIds: ["n3"] }] },
      { id: "n2", type: "service", name: "Auth-Service", x: 80, y: -160, offersRest: true,
        description: "Verwaltet Login, Tokens und Berechtigungen.", events: [] },
      { id: "n3", type: "service", name: "Order-Service", x: 80, y: 60, offersRest: true,
        description: "Nimmt Bestellungen entgegen und verarbeitet sie.",
        events: [{ id: "ev2", name: "OrderCreated", trigger: "BestellungAbsenden", targetIds: ["n2", "n4"] }] },
      { id: "n4", type: "database", name: "Order-DB", x: 400, y: 60, offersRest: false,
        description: "PostgreSQL-Datenbank für Bestelldaten.",
        events: [{ id: "ev3", name: "OrderSaved", trigger: "OrderCreated", targetIds: [] }] },
    ],
    connections: [
      { id: "c1", type: "rest", from: "n1", to: "n2", description: "Login / Token", websocket: false },
      { id: "c2", type: "rest", from: "n1", to: "n3", description: "Bestellungen abrufen", websocket: false },
      { id: "c3", type: "event", from: "n3", to: "n2", description: "OrderCreated", websocket: false },
      { id: "c4", type: "db", from: "n3", to: "n4", description: "", websocket: false },
    ],
    deletedNodes: {},
  };
}

/* Eine ID gilt als vergeben, wenn ein Element, eine Verbindung oder ein Event sie trägt —
   oder wenn noch ein Event-Ziel bzw. deletedNodes auf sie verweist. Sonst würde ein neues
   Element plötzlich als altes (gelöschtes) Ziel gelten. */
export function idInUse(d: Diagram, id: string): boolean {
  return d.connections.some(c => c.id === id)
    || id in d.deletedNodes
    || d.nodes.some(n => n.id === id || n.events.some(e => e.id === id || e.targetIds.includes(id)));
}

/* Vergibt fortlaufende IDs (n101, c102, ev103 …) und überspringt vergebene —
   importierte Diagramme können IDs enthalten, die der Zähler nicht kennt. */
export class IdGenerator {
  constructor(private counter = 100) {}
  next(d: Diagram, prefix: string): string {
    let id: string;
    do { this.counter++; id = prefix + this.counter; } while (idInUse(d, id));
    return id;
  }
}

/* Weg, über den ein Event von fromId nach toId gelangt: bevorzugt die direkte Verbindung;
   sonst der Antwortweg einer eingehenden REST- oder DB-Verbindung (dann in umgekehrter
   Pfeilrichtung). */
export function findConnectionForTravel(d: Diagram, fromId: string, toId: string):
  { conn: Connection; reversed: boolean } | null {
  const direct = d.connections.find(c => c.from === fromId && c.to === toId);
  if (direct) return { conn: direct, reversed: false };
  const response = d.connections.find(c => c.from === toId && c.to === fromId && (c.type === "rest" || c.type === "db"));
  if (response) return { conn: response, reversed: true };
  return null;
}

/* Ziele, die einem Event zur Auswahl stehen:
   1) alle abgehenden Verbindungen des Elements
   2) zusätzlich alle eingehenden REST-Verbindungen (inkl. WebSocket) — REST ist
      Request/Response, eine Antwort kann über den Rückweg verschickt werden. */
export function eventTargetOptions(d: Diagram, node: DiagramNode): Array<{ node: DiagramNode; response: boolean }> {
  const seen = new Set<string>();
  const list: Array<{ node: DiagramNode; response: boolean }> = [];
  for (const c of d.connections) {
    if (c.from === node.id && !seen.has(c.to)) {
      const t = getNode(d, c.to);
      if (t) { seen.add(c.to); list.push({ node: t, response: false }); }
    }
  }
  for (const c of d.connections) {
    if (c.to === node.id && c.type === "rest" && !seen.has(c.from)) {
      const t = getNode(d, c.from);
      if (t) { seen.add(c.from); list.push({ node: t, response: true }); }
    }
  }
  return list;
}

/* Vorschlagsliste für Trigger-Namen: alle Event-Namen der anderen Elemente. Die Events
   des Elements selbst fehlen bewusst — sie fliegen immer vom Element weg und kommen dort
   nie an, ein Trigger darauf würde also nie auslösen. */
export function collectTriggerSuggestions(d: Diagram, forNode: DiagramNode): string[] {
  const names = new Set<string>();
  for (const n of d.nodes) {
    if (n.id === forNode.id) continue;
    for (const e of n.events) if (e.name.trim()) names.add(e.name.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b, "de"));
}

/* Hat der Service eingehende REST-Verbindungen (inkl. WebSocket)? Dann muss er seine
   REST-Schnittstelle behalten. */
export function hasIncomingRest(d: Diagram, node: DiagramNode): boolean {
  return d.connections.some(c => c.to === node.id && c.type === "rest");
}

export function deletedNodeName(d: Diagram, id: string): string {
  return d.deletedNodes[id] ?? id;
}

/* Merkt sich nur Namen gelöschter Elemente, auf die noch ein Ziel verweist. */
export function pruneDeletedNodes(d: Diagram): void {
  const referenced = new Set<string>();
  for (const n of d.nodes) for (const ev of n.events) for (const id of ev.targetIds) {
    if (!getNode(d, id)) referenced.add(id);
  }
  const kept: Record<string, string> = {};
  for (const [id, name] of Object.entries(d.deletedNodes)) if (referenced.has(id)) kept[id] = name;
  d.deletedNodes = kept;
}

export function newNodeName(d: Diagram, type: NodeType): string {
  const prefix = type === "service" ? "Neuer Service" : type === "frontend" ? "Neues Frontend" : "Neue Datenbank";
  return prefix + " " + (d.nodes.filter(n => n.type === type).length + 1);
}
