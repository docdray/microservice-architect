import { findConnectionForTravel, getNode } from "./diagram";
import { eventLabel, type Diagram, type DiagramEvent, type DiagramNode } from "./types";

/* Bildet den Ablauf der Simulation statisch als Graph nach: ein Zustand ist
   "Event E feuert an Element N". Er führt zu jedem Event E' eines Ziels T, dessen Trigger
   dem Namen von E entspricht — sofern es (wie in der Simulation) einen Weg zu T gibt.
   Datenbank-Events antworten an ihren Absender, daher gehört dieser bei ihnen zum Zustand.
   Grundlage für Zyklus-Erkennung und "Trigger löst nie aus". */

export interface FiringState {
  key: string;
  node: DiagramNode;
  ev: DiagramEvent;
  senderId: string | null;
}

export interface EventGraph {
  states: Map<string, FiringState>;
  edges: Map<string, string[]>;
}

export function buildEventGraph(d: Diagram): EventGraph {
  const states = new Map<string, FiringState>();
  const edges = new Map<string, string[]>();
  const queue: string[] = [];
  function addState(node: DiagramNode, ev: DiagramEvent, senderId: string | null) {
    const key = node.id + "|" + ev.id + (node.type === "database" ? "|" + (senderId ?? "") : "");
    if (!states.has(key)) {
      states.set(key, { key, node, ev, senderId });
      queue.push(key);
    }
    return key;
  }
  for (const n of d.nodes) {
    if (n.type !== "database") for (const ev of n.events) addState(n, ev, null);
  }
  while (queue.length) {
    const key = queue.shift()!;
    const { node, ev, senderId } = states.get(key)!;
    const targetIds = node.type === "database" ? (senderId ? [senderId] : []) : ev.targetIds;
    const label = eventLabel(ev);
    const out: string[] = [];
    for (const targetId of targetIds) {
      const target = getNode(d, targetId);
      if (!target || !findConnectionForTravel(d, node.id, targetId)) continue;
      for (const next of target.events) {
        if (next.trigger === label) out.push(addState(target, next, node.id));
      }
    }
    edges.set(key, out);
  }
  return { states, edges };
}

/* Wird das Event ev an node jemals durch ein ankommendes Event ausgelöst? */
export function isTriggeredInGraph(graph: EventGraph, node: DiagramNode, ev: DiagramEvent): boolean {
  for (const targets of graph.edges.values()) {
    for (const key of targets) {
      const st = graph.states.get(key)!;
      if (st.node.id === node.id && st.ev.id === ev.id) return true;
    }
  }
  return false;
}

export interface Cycle {
  keys: Set<string>;
  nodeIds: Set<string>;
  graph: EventGraph;
}

/* Stark zusammenhängende Komponenten (Tarjan); jede mit mehr als einem Zustand oder
   einer Selbstschleife ist ein Zyklus. */
export function detectCycles(graph: EventGraph): Cycle[] {
  const { states, edges } = graph;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const cycles: Cycle[] = [];
  let counter = 0;
  function strongConnect(v: string) {
    index.set(v, counter); low.set(v, counter); counter++;
    stack.push(v); onStack.add(v);
    for (const w of edges.get(v)!) {
      if (!index.has(w)) { strongConnect(w); low.set(v, Math.min(low.get(v)!, low.get(w)!)); }
      else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp = new Set<string>();
      let w: string;
      do { w = stack.pop()!; onStack.delete(w); comp.add(w); } while (w !== v);
      if (comp.size > 1 || edges.get(v)!.includes(v)) {
        cycles.push({ keys: comp, nodeIds: new Set([...comp].map(k => states.get(k)!.node.id)), graph });
      }
    }
  }
  for (const key of states.keys()) if (!index.has(key)) strongConnect(key);
  return cycles;
}

export interface CycleStep { from: FiringState; to: FiringState }

/* Kürzester Umlauf innerhalb eines Zyklus, der beim ersten Event des Elements beginnt. */
export function cyclePathFrom(cycle: Cycle, nodeId: string): CycleStep[] {
  const { states, edges } = cycle.graph;
  const start = [...cycle.keys].find(k => states.get(k)!.node.id === nodeId);
  if (!start) return [];
  const prev = new Map<string, string>();
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of edges.get(u)!) {
      if (!cycle.keys.has(v)) continue;
      if (v === start) {
        const path: CycleStep[] = [{ from: states.get(u)!, to: states.get(v)! }];
        let cur = u;
        while (cur !== start) {
          const p = prev.get(cur)!;
          path.unshift({ from: states.get(p)!, to: states.get(cur)! });
          cur = p;
        }
        return path;
      }
      if (!seen.has(v)) { seen.add(v); prev.set(v, u); queue.push(v); }
    }
  }
  return [];
}
