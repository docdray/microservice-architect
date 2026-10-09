import { connEndpoints, findNodeAt, nodeSize, type Point } from "./model/geometry";
import { createDemoDiagram, emptyDiagram, getConnection, getNode, IdGenerator } from "./model/diagram";
import * as editing from "./model/editing";
import { buildEventGraph, detectCycles } from "./model/eventGraph";
import { History } from "./model/history";
import { parseImport, serializeDiagram } from "./model/importExport";
import { computeOpenEnds } from "./model/openEnds";
import { eventsTriggeredBy, planFire, skippedMessage } from "./model/simulation";
import type { Diagram, DiagramEvent, DiagramNode, HandleType, NodeType } from "./model/types";

/* Zentraler Zustand des Editors. Das Diagramm ist tief reaktiv ($state) — Zyklen und
   offene Enden werden daraus abgeleitet ($derived) und aktualisieren sich von selbst. */

export type Selection = { kind: "node"; id: string } | { kind: "conn"; id: string } | null;
export type MarkerTip = { kind: "cycle" | "open"; nodeId: string; x: number; y: number };

const DRAG_THRESHOLD_PX = 3;
const ZOOM_MIN = 0.15, ZOOM_MAX = 3;

export class Editor {
  diagram = $state<Diagram>(createDemoDiagram());
  selection = $state<Selection>(null);
  view = $state({ tx: window.innerWidth / 2, ty: window.innerHeight / 2, scale: 1 });

  readonly graph = $derived(buildEventGraph(this.diagram));
  readonly cycles = $derived(detectCycles(this.graph));
  readonly openEnds = $derived(computeOpenEnds(this.diagram, this.graph));

  /* laufende Maus-Interaktion — Tooltips werden währenddessen unterdrückt */
  interaction = $state<"idle" | "drag" | "connect" | "pan">("idle");
  tempConn = $state<{ from: Point; to: Point; color: string } | null>(null);

  toastMsg = $state("");
  toastVisible = $state(false);
  confirm = $state<{ message: string; onYes: () => void } | null>(null);
  errors = $state<{ title: string; message: string; items: string[] } | null>(null);
  descTip = $state<{ text: string; x: number; y: number } | null>(null);
  markerTip = $state<MarkerTip | null>(null);
  /* Hervorhebung beim Hovern über Einträge im Ziel-Dropdown */
  glowNodes = $state<string[]>([]);
  glowConns = $state<string[]>([]);
  /* ID des Events, dessen Ziel-Dropdown gerade offen ist */
  openDropdown = $state<string | null>(null);

  canUndo = $state(false);
  canRedo = $state(false);

  readonly ids = new IdGenerator();
  readonly sim = new Simulation(this);
  private readonly history = new History();
  private commitPending = false;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  svgEl: SVGSVGElement | null = null;

  /* ---------- Auswahl ---------- */

  get selectedNode(): DiagramNode | undefined {
    return this.selection?.kind === "node" ? getNode(this.diagram, this.selection.id) : undefined;
  }
  get selectedConnection() {
    return this.selection?.kind === "conn" ? getConnection(this.diagram, this.selection.id) : undefined;
  }
  selectNode(id: string) { this.openDropdown = null; this.selection = { kind: "node", id }; }
  selectConnection(id: string) { this.openDropdown = null; this.selection = { kind: "conn", id }; }
  deselect() { this.selection = null; this.openDropdown = null; this.descTip = null; }

  /* ---------- Ansicht ---------- */

  screenToWorld(clientX: number, clientY: number): Point {
    const rect = this.svgEl!.getBoundingClientRect();
    return { x: (clientX - rect.left - this.view.tx) / this.view.scale, y: (clientY - rect.top - this.view.ty) / this.view.scale };
  }
  worldToScreen(x: number, y: number): Point {
    const rect = this.svgEl!.getBoundingClientRect();
    return { x: rect.left + this.view.tx + x * this.view.scale, y: rect.top + this.view.ty + y * this.view.scale };
  }
  zoomAt(clientX: number, clientY: number, deltaY: number) {
    this.hideTips();
    const rect = this.svgEl!.getBoundingClientRect();
    const mx = clientX - rect.left, my = clientY - rect.top;
    const wx = (mx - this.view.tx) / this.view.scale, wy = (my - this.view.ty) / this.view.scale;
    const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.view.scale * (1 - deltaY * 0.0016)));
    this.view = { tx: mx - wx * scale, ty: my - wy * scale, scale };
  }
  resetView() { this.view = { tx: window.innerWidth / 2, ty: window.innerHeight / 2, scale: 1 }; }

  startPan(e: MouseEvent) {
    const start = { x: e.clientX, y: e.clientY, tx: this.view.tx, ty: this.view.ty };
    this.interaction = "pan";
    this.hideTips();
    this.deselect();
    const onMove = (ev: MouseEvent) => {
      this.hideTips();
      this.view.tx = start.tx + ev.clientX - start.x;
      this.view.ty = start.ty + ev.clientY - start.y;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      this.interaction = "idle";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ---------- Tooltips & Meldungen ---------- */

  toast(msg: string, ms = 2200) {
    this.toastMsg = msg;
    this.toastVisible = true;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toastVisible = false; }, ms);
  }
  hideToast() { this.toastVisible = false; }

  showDescription(node: DiagramNode) {
    if (this.interaction !== "idle" || !node.description.trim()) return;
    const pos = this.worldToScreen(node.x, node.y - nodeSize(node).h / 2);
    this.descTip = { text: node.description, x: pos.x, y: pos.y };
  }
  showMarkerTip(kind: "cycle" | "open", nodeId: string, el: Element) {
    if (this.interaction !== "idle") return;
    this.descTip = null;
    const r = el.getBoundingClientRect();
    this.markerTip = { kind, nodeId, x: r.left + r.width / 2, y: r.top };
  }
  hideTips() { this.descTip = null; this.markerTip = null; }

  /* ---------- Elemente ziehen ---------- */

  /* Ziehen erst ab einer Gesamtstrecke in Bildschirmpixeln seit dem Klick — unabhängig von
     Zoom und Mausgeschwindigkeit. Kleineres Zittern zählt als Klick und verschiebt nichts. */
  startNodeDrag(node: DiagramNode, e: MouseEvent) {
    const start = this.screenToWorld(e.clientX, e.clientY);
    const off = { x: start.x - node.x, y: start.y - node.y };
    let moved = false;
    this.interaction = "drag";
    this.hideTips();
    const onMove = (ev: MouseEvent) => {
      if (!moved) {
        if (Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) <= DRAG_THRESHOLD_PX) return;
        moved = true;
      }
      const w = this.screenToWorld(ev.clientX, ev.clientY);
      node.x = w.x - off.x;
      node.y = w.y - off.y;
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      this.interaction = "idle";
      if (!moved) this.selectNode(node.id);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  /* ---------- Verbindungen ziehen ---------- */

  startConnectionDrag(source: DiagramNode, handle: HandleType) {
    const from = { x: source.x, y: source.y };
    const color = handle === "rest" ? "var(--accent-rest)" : "var(--accent-event)";
    this.interaction = "connect";
    this.hideTips();
    this.toast(handle === "rest" ? "REST-Verbindung ziehen und auf Ziel-Service loslassen …" : "Event-Verbindung ziehen und auf Ziel-Service loslassen …", 4000);
    const onMove = (ev: MouseEvent) => { this.tempConn = { from, to: this.screenToWorld(ev.clientX, ev.clientY), color }; };
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      this.tempConn = null;
      this.interaction = "idle";
      this.hideToast();
      const w = this.screenToWorld(ev.clientX, ev.clientY);
      const target = findNodeAt(this.diagram, w.x, w.y);
      if (target && target.id !== source.id) this.connect(source, target, handle);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  connect(source: DiagramNode, target: DiagramNode, handle: HandleType) {
    const result = editing.createConnection(this.diagram, this.ids, source, target, handle);
    if ("error" in result) this.toast(result.error, 4000);
    else this.selectConnection(result.conn.id);
  }

  /* ---------- Bearbeiten ---------- */

  addNode(type: NodeType) {
    const center = this.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
    const jitter = () => (Math.random() - 0.5) * 80;
    const node = editing.addNode(this.diagram, this.ids, type, center.x + jitter(), center.y + jitter());
    this.selectNode(node.id);
  }
  addEvent(node: DiagramNode) { editing.addEvent(this.diagram, this.ids, node); }
  deleteNode(id: string) { editing.deleteNode(this.diagram, id); this.deselect(); }
  deleteConnection(id: string) { editing.deleteConnection(this.diagram, id); this.deselect(); }
  deleteSelected() {
    if (this.selection?.kind === "node") this.deleteNode(this.selection.id);
    else if (this.selection?.kind === "conn") this.deleteConnection(this.selection.id);
  }
  clearAll() {
    this.confirm = {
      message: "Wirklich das gesamte Diagramm löschen?",
      onYes: () => { this.sim.stop(); this.diagram = emptyDiagram(); this.deselect(); },
    };
  }

  /* ---------- Import / Export ---------- */

  exportFile() {
    const blob = new Blob([serializeDiagram(this.diagram)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "microservice-architektur.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async importFile(file: File) {
    const result = parseImport(await file.text());
    if ("errors" in result) {
      this.errors = {
        title: "Import fehlgeschlagen",
        message: "Die Datei „" + file.name + "“ wurde nicht importiert. Das aktuelle Diagramm bleibt unverändert.",
        items: result.errors,
      };
      return;
    }
    // Erst nach erfolgreicher Prüfung wird der bestehende Zustand ersetzt.
    this.sim.stop();
    this.diagram = result.diagram;
    this.deselect();
    this.commitHistory(); // asynchron gelesen — von der automatischen Erfassung nicht abgedeckt
    this.toast("Diagramm importiert.");
  }

  /* ---------- Rückgängig / Wiederholen ----------
     Nach jeder abgeschlossenen Benutzeraktion (Klick, Loslassen der Maus, abgeschlossene
     Eingabe, Taste außerhalb von Textfeldern) wird geprüft, ob sich das Diagramm geändert
     hat — wenn ja, entsteht ein Schritt. Tippen ergibt so einen Schritt pro Eingabe,
     Ziehen einen pro Ziehvorgang. Die Erfassung hängt an globalen Listenern (App.svelte). */

  commitHistory() {
    this.history.commit(JSON.stringify(this.diagram));
    this.canUndo = this.history.canUndo;
    this.canRedo = this.history.canRedo;
  }

  /* Erst nach allen Handlern der laufenden Benutzeraktion prüfen. */
  scheduleCommit() {
    if (this.commitPending) return;
    this.commitPending = true;
    setTimeout(() => { this.commitPending = false; this.commitHistory(); }, 0);
  }

  /* Laufende Texteingaben werden erst beim Verlassen des Felds erfasst — Rückgängig muss
     aber schon währenddessen bedienbar sein (undo() sichert die Eingabe vorher). */
  markTextDirty() { this.canUndo = true; }

  undo() {
    this.commitHistory(); // noch nicht erfasste Änderungen (z. B. laufende Texteingabe) zuerst sichern
    const snap = this.history.undo();
    if (snap !== null) this.restore(snap);
  }
  redo() {
    this.commitHistory();
    const snap = this.history.redo();
    if (snap !== null) this.restore(snap);
  }
  private restore(snap: string) {
    this.sim.stop();
    this.hideTips();
    this.openDropdown = null;
    this.diagram = JSON.parse(snap);
    // Auswahl beibehalten, wenn das Element bzw. die Verbindung noch existiert
    if (this.selection && !this.selectedNode && !this.selectedConnection) this.deselect();
    this.canUndo = this.history.canUndo;
    this.canRedo = this.history.canRedo;
  }
}

/* ---------- Simulation ----------
   Event-Namen fliegen als Label entlang der Verbindungen (eigenes, framebasiertes Tweening
   statt SMIL — dessen Zeitachse hängt am Dokument-Ladezeitpunkt). Bei Ankunft werden die
   Events mit passendem Trigger ausgelöst; das läuft weiter, bis nichts mehr getriggert wird. */

const FLIGHT_MS = 1300;

interface Flight {
  id: number;
  label: string;
  from: Point;
  to: Point;
  x: number;
  y: number;
  start: number;
  targetId: string;
  senderId: string;
}

export class Simulation {
  flights = $state<Flight[]>([]);
  private active = false;
  private raf = 0;
  private seq = 0;

  constructor(private readonly ed: Editor) {}

  /* Manueller Start per Button — unabhängig vom hinterlegten Trigger. */
  start(node: DiagramNode, ev: DiagramEvent) { this.fire(node, ev, null); }

  private fire(node: DiagramNode, ev: DiagramEvent, senderId: string | null) {
    this.active = true;
    const plan = planFire(this.ed.diagram, node, ev, senderId);
    if (plan.kind === "error") { this.ed.toast(plan.message); return; }
    for (const hop of plan.hops) {
      const ep = connEndpoints(this.ed.diagram, hop.conn);
      if (!ep) continue;
      const [from, to] = hop.reversed ? [ep.p2, ep.p1] : [ep.p1, ep.p2];
      this.flights.push({ id: ++this.seq, label: plan.label, from, to, x: from.x, y: from.y,
        start: performance.now(), targetId: hop.target.id, senderId: node.id });
    }
    // Offene Enden werden übersprungen — aber nicht stillschweigend
    if (plan.skipped.length) this.ed.toast(skippedMessage(ev, plan.skipped), 3500);
    if (!this.raf && this.flights.length) this.raf = requestAnimationFrame(this.step);
  }

  /* Ein gemeinsamer Animationsschritt für alle fliegenden Events */
  private step = (now: number) => {
    this.raf = 0;
    if (!this.active) return;
    const arrived: Flight[] = [];
    for (const f of this.flights) {
      const t = Math.min(1, (now - f.start) / FLIGHT_MS);
      f.x = f.from.x + (f.to.x - f.from.x) * t;
      f.y = f.from.y + (f.to.y - f.from.y) * t;
      if (t >= 1) arrived.push(f);
    }
    if (arrived.length) {
      const done = new Set(arrived.map(f => f.id));
      this.flights = this.flights.filter(f => !done.has(f.id));
      for (const f of arrived) {
        const target = getNode(this.ed.diagram, f.targetId);
        if (!target) continue;
        for (const next of eventsTriggeredBy(target, f.label)) if (this.active) this.fire(target, next, f.senderId);
      }
    }
    if (this.active && this.flights.length && !this.raf) this.raf = requestAnimationFrame(this.step);
  };

  stop() {
    const wasActive = this.active || this.flights.length > 0;
    this.active = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.flights = [];
    if (wasActive) this.ed.toast("Simulation gestoppt.");
  }
}
