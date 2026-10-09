import type { Connection, ConnType, Diagram, DiagramEvent, DiagramNode, NodeType } from "../../src/lib/model/types";

/* Kompakte Bausteine für Test-Diagramme */
export const ev = (id: string, name: string, trigger: string, targetIds: string[] = []): DiagramEvent =>
  ({ id, name, trigger, targetIds });

export const node = (id: string, type: NodeType, events: DiagramEvent[] = [], extra: Partial<DiagramNode> = {}): DiagramNode =>
  ({ id, type, name: id.toUpperCase(), x: 0, y: 0, offersRest: type === "service", description: "", events, ...extra });

export const conn = (id: string, type: ConnType, from: string, to: string): Connection =>
  ({ id, type, from, to, description: "", websocket: false });

export const diagram = (nodes: DiagramNode[], connections: Connection[] = [], deletedNodes: Record<string, string> = {}): Diagram =>
  ({ nodes, connections, deletedNodes });
