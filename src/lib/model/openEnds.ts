import { deletedNodeName, findConnectionForTravel, getNode } from "./diagram";
import { isTriggeredInGraph, type EventGraph } from "./eventGraph";
import { BUTTON_TRIGGER, eventLabel, type Diagram, type DiagramEvent, type DiagramNode } from "./types";

/* Offene Enden: Während des Entwerfens darf ein Diagramm unfertig sein. Statt
   Abhängigkeiten ungefragt aufzuräumen, bleiben sie stehen und werden markiert:
   - Ziel verweist auf ein gelöschtes Element
   - Ziel existiert, ist aber über keine Verbindung erreichbar
   - Trigger kann nie auslösen (kein Event mit dem Namen, oder es wird nicht an dieses
     Element gesendet) — ermittelt über denselben Event-Graphen wie die Zyklen */

export type TargetStatus = { kind: "deleted" | "unreachable"; name: string };
export type TriggerStatus = { kind: "noEvent" | "notSent" };
export type OpenEnd =
  | { ev: DiagramEvent; kind: "deleted" | "unreachable"; name: string }
  | { ev: DiagramEvent; kind: "noEvent" | "notSent"; trigger: string };

/* null = Ziel in Ordnung */
export function targetStatus(d: Diagram, node: DiagramNode, targetId: string): TargetStatus | null {
  const target = getNode(d, targetId);
  if (!target) return { kind: "deleted", name: deletedNodeName(d, targetId) };
  if (!findConnectionForTravel(d, node.id, targetId)) return { kind: "unreachable", name: target.name };
  return null;
}

/* null = Trigger in Ordnung oder nicht relevant (Button, kein Trigger, Frontend) */
export function triggerStatus(d: Diagram, node: DiagramNode, ev: DiagramEvent, graph: EventGraph): TriggerStatus | null {
  if (node.type === "frontend" || !ev.trigger || ev.trigger === BUTTON_TRIGGER) return null;
  if (isTriggeredInGraph(graph, node, ev)) return null;
  const exists = d.nodes.some(n => n.id !== node.id && n.events.some(e => eventLabel(e) === ev.trigger));
  return { kind: exists ? "notSent" : "noEvent" };
}

export function openEndText(item: { kind: "deleted" | "unreachable"; name: string } | { kind: "noEvent" | "notSent"; trigger: string }): string {
  switch (item.kind) {
    case "deleted": return "Ziel „" + item.name + "“ wurde gelöscht";
    case "unreachable": return "keine Verbindung zu „" + item.name + "“";
    case "noEvent": return "Trigger „" + item.trigger + "“: kein Event mit diesem Namen";
    case "notSent": return "Trigger „" + item.trigger + "“: wird nicht an dieses Element gesendet";
  }
}

/* nodeId → offene Enden — nur Elemente, die welche haben */
export function computeOpenEnds(d: Diagram, graph: EventGraph): Map<string, OpenEnd[]> {
  const result = new Map<string, OpenEnd[]>();
  for (const node of d.nodes) {
    const items: OpenEnd[] = [];
    for (const ev of node.events) {
      if (node.type !== "database") {
        for (const targetId of ev.targetIds) {
          const st = targetStatus(d, node, targetId);
          if (st) items.push({ ev, ...st });
        }
      }
      const ts = triggerStatus(d, node, ev, graph);
      if (ts) items.push({ ev, ...ts, trigger: ev.trigger });
    }
    if (items.length) result.set(node.id, items);
  }
  return result;
}
