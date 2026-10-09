import { getNode, newNodeName, pruneDeletedNodes, type IdGenerator } from "./diagram";
import { connectionRuleError, duplicateConnectionError, resolveConnType } from "./rules";
import { BUTTON_TRIGGER, type Connection, type Diagram, type DiagramEvent, type DiagramNode, type HandleType, type NodeType } from "./types";

/* Bearbeitungsoperationen auf einem Diagramm. Sie verändern das übergebene Diagramm. */

export function addNode(d: Diagram, ids: IdGenerator, type: NodeType, x: number, y: number): DiagramNode {
  const node: DiagramNode = {
    id: ids.next(d, "n"), type, name: newNodeName(d, type), x, y,
    offersRest: type === "service", description: "", events: [],
  };
  d.nodes.push(node);
  return node;
}

/* Legt eine Verbindung an, wenn Regeln und Duplikatprüfung es erlauben. */
export function createConnection(d: Diagram, ids: IdGenerator, source: DiagramNode, target: DiagramNode, handle: HandleType):
  { conn: Connection } | { error: string } {
  const type = resolveConnType(handle, target);
  const error = connectionRuleError(source, target, type) ?? duplicateConnectionError(d, source, target, type);
  if (error) return { error };
  const conn: Connection = { id: ids.next(d, "c"), type, from: source.id, to: target.id, description: "", websocket: false };
  d.connections.push(conn);
  return { conn };
}

/* Löschen räumt Events bewusst nicht auf: Ziele, die danach nicht mehr erreichbar sind oder
   auf ein gelöschtes Element zeigen, bleiben als offene Enden stehen. */
export function deleteConnection(d: Diagram, connId: string): void {
  d.connections = d.connections.filter(c => c.id !== connId);
}

export function deleteNode(d: Diagram, nodeId: string): void {
  const node = getNode(d, nodeId);
  if (!node) return;
  d.nodes = d.nodes.filter(n => n.id !== nodeId);
  d.connections = d.connections.filter(c => c.from !== nodeId && c.to !== nodeId);
  // Namen merken, damit verbleibende Ziele "gelöscht: Name" anzeigen können
  d.deletedNodes = { ...d.deletedNodes, [nodeId]: node.name };
  pruneDeletedNodes(d);
}

export function addEvent(d: Diagram, ids: IdGenerator, node: DiagramNode): DiagramEvent {
  const ev: DiagramEvent = {
    id: ids.next(d, "ev"), name: "Neues Event",
    trigger: node.type === "database" ? "" : BUTTON_TRIGGER, targetIds: [],
  };
  node.events.push(ev);
  return ev;
}

export function deleteEvent(node: DiagramNode, eventId: string): void {
  node.events = node.events.filter(e => e.id !== eventId);
}

/* Trigger, die nach einer Umbenennung ins Leere zeigen: alle Trigger auf oldName — außer
   ein anderes Event heißt noch so, dann hören sie weiterhin auf dieses. */
export function orphanedTriggers(d: Diagram, renamed: DiagramEvent, oldName: string | null):
  Array<{ node: DiagramNode; ev: DiagramEvent }> {
  if (!oldName || renamed.name === oldName) return [];
  const stillUsed = d.nodes.some(n => n.events.some(e => e.id !== renamed.id && e.name === oldName));
  if (stillUsed) return [];
  return d.nodes.flatMap(n => n.events.filter(e => e.trigger === oldName).map(ev => ({ node: n, ev })));
}

export function toggleTarget(ev: DiagramEvent, targetId: string, on: boolean): void {
  if (on) { if (!ev.targetIds.includes(targetId)) ev.targetIds.push(targetId); }
  else ev.targetIds = ev.targetIds.filter(id => id !== targetId);
}
