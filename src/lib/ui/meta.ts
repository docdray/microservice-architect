import type { ConnType, NodeType } from "../model/types";

/* Darstellung je Element- und Verbindungstyp */

export const TYPE_META: Record<NodeType, { stroke: string; fill: string; label: string }> = {
  service: { stroke: "var(--accent-service)", fill: "var(--accent-service-fill)", label: "SERVICE" },
  frontend: { stroke: "var(--accent-frontend)", fill: "var(--accent-frontend-fill)", label: "FRONTEND" },
  database: { stroke: "var(--accent-db)", fill: "var(--accent-db-fill)", label: "DATENBANK" },
};

export const CONN_META: Record<ConnType, { color: string; marker: string; dash: string; label: string }> = {
  rest: { color: "var(--accent-rest)", marker: "url(#arrow-rest)", dash: "none", label: "REST" },
  event: { color: "var(--accent-event)", marker: "url(#arrow-event)", dash: "none", label: "EVENT" },
  db: { color: "var(--accent-dbconn)", marker: "url(#arrow-db)", dash: "5 5", label: "DB" },
};
