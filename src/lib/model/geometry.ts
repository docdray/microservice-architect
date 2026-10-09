import { getNode } from "./diagram";
import type { Connection, Diagram, DiagramNode, NodeType } from "./types";

export interface Point { x: number; y: number }

const NODE_W: Record<NodeType, number> = { service: 150, frontend: 150, database: 130 };
const NODE_H: Record<NodeType, number> = { service: 64, frontend: 64, database: 74 };

export function nodeSize(node: Pick<DiagramNode, "type">) {
  return { w: NODE_W[node.type], h: NODE_H[node.type] };
}

/* Schnittpunkt der Linie zwischen zwei Mittelpunkten mit dem Rand des Elements */
export function edgePoint(node: DiagramNode, towardX: number, towardY: number): Point {
  const { w, h } = nodeSize(node);
  const dx = towardX - node.x, dy = towardY - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };
  const scaleX = dx !== 0 ? (w / 2) / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? (h / 2) / Math.abs(dy) : Infinity;
  const s = Math.min(scaleX, scaleY);
  return { x: node.x + dx * s, y: node.y + dy * s };
}

/* Verbindungen zwischen demselben Elementpaar (unabhängig von Richtung/Typ) werden parallel
   versetzt, damit übereinanderliegende Pfeile alle sichtbar und anklickbar bleiben. */
const PARALLEL_SPACING = 16;
const pairKey = (c: Connection) => [c.from, c.to].sort().join("|");

export function connOffset(d: Diagram, conn: Connection): number {
  const ids = d.connections.filter(c => pairKey(c) === pairKey(conn)).map(c => c.id);
  if (ids.length <= 1) return 0;
  return (ids.indexOf(conn.id) - (ids.length - 1) / 2) * PARALLEL_SPACING;
}

export function connEndpoints(d: Diagram, conn: Connection): { p1: Point; p2: Point } | null {
  const a = getNode(d, conn.from), b = getNode(d, conn.to);
  if (!a || !b) return null;
  let p1 = edgePoint(a, b.x, b.y);
  let p2 = edgePoint(b, a.x, a.y);
  const offset = connOffset(d, conn);
  if (offset !== 0) {
    // Kanonische Normale anhand einer festen Knoten-Reihenfolge (unabhängig von der
    // Pfeilrichtung), damit Hin- und Rückverbindungen echt parallel bleiben.
    const [loId, hiId] = [conn.from, conn.to].sort() as [string, string];
    const lo = getNode(d, loId)!, hi = getNode(d, hiId)!;
    const cdx = hi.x - lo.x, cdy = hi.y - lo.y;
    const clen = Math.hypot(cdx, cdy) || 1;
    const nx = -cdy / clen, ny = cdx / clen;
    p1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
    p2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
  }
  return { p1, p2 };
}

/* Oberstes Element an einer Weltkoordinate */
export function findNodeAt(d: Diagram, x: number, y: number): DiagramNode | null {
  for (let i = d.nodes.length - 1; i >= 0; i--) {
    const n = d.nodes[i]!;
    const { w, h } = nodeSize(n);
    if (x >= n.x - w / 2 && x <= n.x + w / 2 && y >= n.y - h / 2 && y <= n.y + h / 2) return n;
  }
  return null;
}
