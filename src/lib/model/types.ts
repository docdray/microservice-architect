/* Datenmodell eines Diagramms. Entspricht 1:1 dem JSON-Export. */

export type NodeType = "service" | "frontend" | "database";
export type ConnType = "rest" | "event" | "db";
/* Ziehbare Anfasser am Element: R (REST) und E (Event). Ein REST-Anfasser auf eine
   Datenbank gezogen ergibt eine DB-Verbindung. */
export type HandleType = "rest" | "event";

/* Trigger-Wert für Events, die nur manuell per Button gestartet werden. */
export const BUTTON_TRIGGER = "__button__";

export interface DiagramEvent {
  id: string;
  name: string;
  /* Name des Events, dessen Ankunft dieses Event auslöst — oder BUTTON_TRIGGER.
     Bei Datenbanken bedeutet "" "noch kein Trigger gewählt". */
  trigger: string;
  /* Ziele (Element-IDs). Bei Datenbanken ungenutzt — sie antworten immer dem Absender.
     Darf auf nicht (mehr) existierende Elemente verweisen ("offene Enden"). */
  targetIds: string[];
}

export interface DiagramNode {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  offersRest: boolean;
  description: string;
  events: DiagramEvent[];
}

export interface Connection {
  id: string;
  type: ConnType;
  from: string;
  to: string;
  description: string;
  websocket: boolean;
}

export interface Diagram {
  nodes: DiagramNode[];
  connections: Connection[];
  /* id → Name gelöschter Elemente, auf die noch Event-Ziele verweisen */
  deletedNodes: Record<string, string>;
}

export const NODE_TYPES: readonly NodeType[] = ["service", "frontend", "database"];
export const CONN_TYPES: readonly ConnType[] = ["rest", "event", "db"];

/* Lesbare Namen in Meldungen */
export const CONN_NAMES: Record<ConnType, string> = { rest: "REST", event: "Event", db: "Datenbank" };

/* Bezeichnung von Events ohne Namen — auch der Name, unter dem sie bei Triggern ankommen. */
export const UNNAMED_EVENT = "(Event)";
export const eventLabel = (ev: DiagramEvent) => ev.name || UNNAMED_EVENT;
