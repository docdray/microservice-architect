import { deletedNodeName, findConnectionForTravel, getNode } from "./diagram";
import { eventLabel, type Connection, type Diagram, type DiagramEvent, type DiagramNode } from "./types";

/* Fachlogik der Simulation (ohne Animation): wohin fliegt ein Event, und welche Events
   löst seine Ankunft aus. */

export interface Hop { conn: Connection; reversed: boolean; target: DiagramNode }

export type FirePlan =
  | { kind: "error"; message: string }
  | { kind: "fire"; label: string; hops: Hop[]; skipped: string[] };

/* Bei Datenbank-Events ist das Ziel immer der Absender (senderId) — Datenbanken können
   nur antworten. Offene Ziele werden übersprungen und gemeldet. */
export function planFire(d: Diagram, node: DiagramNode, ev: DiagramEvent, senderId: string | null): FirePlan {
  let targetIds: string[];
  if (node.type === "database") {
    if (!senderId) return { kind: "error", message: 'Event "' + (ev.name || "?") + '" kann nur automatisch als Antwort ausgelöst werden.' };
    targetIds = [senderId];
  } else {
    targetIds = ev.targetIds;
  }
  if (!targetIds.length) return { kind: "error", message: 'Event "' + (ev.name || "?") + '" hat keine Ziele ausgewählt.' };

  const hops: Hop[] = [];
  const skipped: string[] = [];
  for (const targetId of targetIds) {
    const hop = findConnectionForTravel(d, node.id, targetId);
    const target = getNode(d, targetId);
    if (!hop || !target) {
      skipped.push(target ? target.name : deletedNodeName(d, targetId) + " (gelöscht)");
      continue;
    }
    hops.push({ ...hop, target });
  }
  return { kind: "fire", label: eventLabel(ev), hops, skipped };
}

export function skippedMessage(ev: DiagramEvent, skipped: string[]): string {
  return "Event „" + eventLabel(ev) + "“: nicht erreichbar und übersprungen: " + skipped.join(", ");
}

/* Am Zielelement ankommendes Event: alle Events, deren Trigger exakt dem Namen entspricht. */
export function eventsTriggeredBy(node: DiagramNode, label: string): DiagramEvent[] {
  return node.events.filter(e => e.trigger === label);
}
