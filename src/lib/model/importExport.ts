import { pruneDeletedNodes } from "./diagram";
import { connectionRuleError } from "./rules";
import { CONN_NAMES, CONN_TYPES, NODE_TYPES, type ConnType, type Diagram, type NodeType } from "./types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const isNonEmptyStr = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/* Prüft eine Import-Datei vollständig, bevor irgendetwas am aktuellen Diagramm verändert
   wird. Liefert eine Liste lesbarer Fehlermeldungen (leer = Datei ist sauber).
   Erlaubt sind offene Enden: Event-Ziele auf nicht vorhandene Elemente. */
export function validateImport(data: unknown): string[] {
  const errors: string[] = [];
  const optType = (obj: Obj, key: string, type: string, where: string) => {
    if (obj[key] !== undefined && typeof obj[key] !== type) {
      errors.push(where + ": „" + key + "“ muss vom Typ " + type + " sein.");
    }
  };

  if (!isObj(data)) {
    errors.push("Die Datei muss ein JSON-Objekt mit „nodes“ und „connections“ enthalten.");
    return errors;
  }
  if (!Array.isArray(data.nodes)) errors.push("„nodes“ fehlt oder ist keine Liste.");
  if (!Array.isArray(data.connections)) errors.push("„connections“ fehlt oder ist keine Liste.");
  if (errors.length) return errors;
  const nodes = data.nodes as unknown[];
  const connections = data.connections as unknown[];

  const nodeIds = new Set<string>();
  const nodesById = new Map<string, Obj>();
  const eventIds = new Set<string>();
  const isNodeType = (t: unknown): t is NodeType => NODE_TYPES.includes(t as NodeType);
  const isConnType = (t: unknown): t is ConnType => CONN_TYPES.includes(t as ConnType);

  nodes.forEach((n, i) => {
    let where = "Element " + (i + 1);
    if (!isObj(n)) { errors.push(where + ": ist kein Objekt."); return; }
    if (isNonEmptyStr(n.name)) where += " („" + n.name + "“)";

    if (!isNonEmptyStr(n.id)) errors.push(where + ": „id“ fehlt oder ist leer.");
    else if (nodeIds.has(n.id)) errors.push(where + ": ID „" + n.id + "“ ist mehrfach vergeben.");
    else { nodeIds.add(n.id); nodesById.set(n.id, n); }

    if (!isNodeType(n.type)) {
      errors.push(where + ": unbekannter Typ „" + n.type + "“ (erlaubt: " + NODE_TYPES.join(", ") + ").");
    }
    if (typeof n.name !== "string") errors.push(where + ": „name“ fehlt oder ist kein Text.");
    if (!isNum(n.x) || !isNum(n.y)) errors.push(where + ": Position „x“/„y“ fehlt oder ist keine Zahl.");
    optType(n, "description", "string", where);
    optType(n, "offersRest", "boolean", where);
    if (n.events !== undefined && !Array.isArray(n.events)) errors.push(where + ": „events“ ist keine Liste.");
  });

  // Events erst nach allen Elementen prüfen
  nodes.forEach((n, i) => {
    if (!isObj(n) || !Array.isArray(n.events)) return;
    const nodeWhere = "Element " + (i + 1) + (isNonEmptyStr(n.name) ? " („" + n.name + "“)" : "");
    (n.events as unknown[]).forEach((ev, j) => {
      const where = nodeWhere + ", Event " + (j + 1);
      if (!isObj(ev)) { errors.push(where + ": ist kein Objekt."); return; }
      if (!isNonEmptyStr(ev.id)) errors.push(where + ": „id“ fehlt oder ist leer.");
      else if (eventIds.has(ev.id)) errors.push(where + ": ID „" + ev.id + "“ ist mehrfach vergeben.");
      else eventIds.add(ev.id);
      if (typeof ev.name !== "string") errors.push(where + ": „name“ fehlt oder ist kein Text.");
      if (typeof ev.trigger !== "string") errors.push(where + ": „trigger“ fehlt oder ist kein Text.");
      if (ev.targetIds !== undefined) {
        if (!Array.isArray(ev.targetIds)) errors.push(where + ": „targetIds“ ist keine Liste.");
        else (ev.targetIds as unknown[]).forEach(t => {
          // Ziele auf nicht (mehr) vorhandene Elemente sind erlaubt — sie gelten als offene Enden.
          if (!isNonEmptyStr(t)) errors.push(where + ": Ziel-IDs müssen Text sein.");
        });
      }
    });
  });

  if (data.deletedNodes !== undefined) {
    if (!isObj(data.deletedNodes) || Object.values(data.deletedNodes).some(v => typeof v !== "string")) {
      errors.push("„deletedNodes“ muss ein Objekt aus ID → Name (Text) sein.");
    }
  }

  const connIds = new Set<string>();
  const connKeys = new Set<string>();
  connections.forEach((c, i) => {
    const where = "Verbindung " + (i + 1) + (isObj(c) && isNonEmptyStr(c.id) ? " („" + c.id + "“)" : "");
    if (!isObj(c)) { errors.push(where + ": ist kein Objekt."); return; }
    if (!isNonEmptyStr(c.id)) errors.push(where + ": „id“ fehlt oder ist leer.");
    else if (connIds.has(c.id)) errors.push(where + ": ID ist mehrfach vergeben.");
    else connIds.add(c.id);
    if (!isConnType(c.type)) {
      errors.push(where + ": unbekannter Typ „" + c.type + "“ (erlaubt: " + CONN_TYPES.join(", ") + ").");
    }
    if (!nodeIds.has(c.from as string)) errors.push(where + ": Start-Element „" + c.from + "“ existiert nicht.");
    if (!nodeIds.has(c.to as string)) errors.push(where + ": Ziel-Element „" + c.to + "“ existiert nicht.");
    if (c.from !== undefined && c.from === c.to) errors.push(where + ": verbindet ein Element mit sich selbst.");
    else if (nodesById.has(c.from as string) && nodesById.has(c.to as string) && isConnType(c.type)) {
      const from = nodesById.get(c.from as string)!, to = nodesById.get(c.to as string)!;
      // Regeln nur prüfen, wenn beide Elemente einen gültigen Typ haben (sonst gibt es schon einen Fehler)
      if (isNodeType(from.type) && isNodeType(to.type)) {
        const ruleError = connectionRuleError(
          { type: from.type, name: String(from.name), offersRest: !!from.offersRest },
          { type: to.type, name: String(to.name), offersRest: !!to.offersRest },
          c.type);
        if (ruleError) errors.push(where + ": " + ruleError);
      }
      const connKey = c.type + "|" + c.from + "|" + c.to;
      if (connKeys.has(connKey)) errors.push(where + ": doppelte " + CONN_NAMES[c.type] + "-Verbindung von „" + c.from + "“ nach „" + c.to + "“.");
      connKeys.add(connKey);
    }
    optType(c, "description", "string", where);
    optType(c, "websocket", "boolean", where);
  });

  return errors;
}

/* Ergänzt optionale Felder mit Standardwerten. Nur für Daten, die validateImport bestanden haben. */
export function normalizeImport(data: unknown): Diagram {
  const d = data as {
    nodes: Array<Obj & { type: NodeType; name: string; events?: Array<Obj & { name: string; trigger: string; targetIds?: string[] }> }>;
    connections: Obj[];
    deletedNodes?: Record<string, string>;
  };
  return {
    nodes: d.nodes.map(n => ({
      ...n,
      description: (n.description as string | undefined) || "",
      offersRest: n.type === "service" && !!n.offersRest,
      events: (n.events ?? []).map(ev => ({ ...ev, name: ev.name.trim(), trigger: ev.trigger.trim(), targetIds: ev.targetIds ?? [] })),
    })) as unknown as Diagram["nodes"],
    connections: d.connections.map(c => ({
      ...c,
      description: (c.description as string | undefined) || "",
      websocket: !!c.websocket,
    })) as unknown as Diagram["connections"],
    deletedNodes: { ...(d.deletedNodes ?? {}) },
  };
}

/* JSON für den Export. Entfernt dabei nicht mehr benötigte Namen gelöschter Elemente. */
export function serializeDiagram(d: Diagram): string {
  pruneDeletedNodes(d);
  return JSON.stringify({ nodes: d.nodes, connections: d.connections, deletedNodes: d.deletedNodes }, null, 2);
}

/* Ergebnis des Imports einer Datei: entweder ein Diagramm oder eine Fehlerliste. */
export function parseImport(text: string): { diagram: Diagram } | { errors: string[] } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err) {
    return { errors: ["Die Datei ist kein gültiges JSON: " + (err as Error).message] };
  }
  const errors = validateImport(data);
  return errors.length ? { errors } : { diagram: normalizeImport(data) };
}
