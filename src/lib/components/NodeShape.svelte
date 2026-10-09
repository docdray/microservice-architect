<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { DiagramNode, HandleType } from "../model/types";
  import { nodeLabel, nodeSize } from "../model/geometry";
  import { TYPE_META } from "../ui/meta";
  import Marker from "./Marker.svelte";

  let { ed, node }: { ed: Editor; node: DiagramNode } = $props();

  const meta = $derived(TYPE_META[node.type]);
  const size = $derived(nodeSize(node));
  const label = $derived(nodeLabel(node));
  const w = $derived(size.w);
  const h = $derived(size.h);
  const selected = $derived(ed.selection?.kind === "node" && ed.selection.id === node.id);
  const hasCycle = $derived(ed.cycles.some(c => c.nodeIds.has(node.id)));
  const hasOpenEnds = $derived(ed.openEnds.has(node.id));
  const ELL_H = 14; // Höhe der Ellipse des Datenbank-Zylinders

  /* Anfasser: R (REST) für Service & Frontend, E (Event) nur für Service.
     Datenbanken können keine Verbindung aufbauen, Frontends keine Event-Verbindung. */
  const handles = $derived([
    ...(node.type !== "database" ? [{ type: "rest" as HandleType, side: -1, color: "var(--accent-rest)", letter: "R" }] : []),
    ...(node.type === "service" ? [{ type: "event" as HandleType, side: 1, color: "var(--accent-event)", letter: "E" }] : []),
  ]);

  function onMouseDown(e: MouseEvent) {
    e.stopPropagation();
    ed.descTip = null;
    ed.startNodeDrag(node, e);
  }
  function onHandleDown(e: MouseEvent, type: HandleType) {
    e.stopPropagation();
    ed.descTip = null;
    ed.startConnectionDrag(node, type);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g class="node-shape" class:node-glow={ed.glowNodes.includes(node.id)} transform="translate({node.x},{node.y})" data-id={node.id}
  onmousedown={onMouseDown} onmouseenter={() => ed.showDescription(node)} onmouseleave={() => (ed.descTip = null)}>
  {#if node.type === "database"}
    <path class="node-rect" fill="var(--accent-db-fill)" stroke={meta.stroke}
      d="M {-w / 2},{-h / 2 + ELL_H} A {w / 2},{ELL_H} 0 0 1 {w / 2},{-h / 2 + ELL_H} L {w / 2},{h / 2 - ELL_H} A {w / 2},{ELL_H} 0 0 1 {-w / 2},{h / 2 - ELL_H} Z"></path>
    <ellipse cx="0" cy={-h / 2 + ELL_H} rx={w / 2} ry={ELL_H} fill="#0f2a1c" stroke={meta.stroke} stroke-width="1.6"></ellipse>
  {:else}
    <rect class="node-rect" x={-w / 2} y={-h / 2} width={w} height={h} rx="9" fill={meta.fill} stroke={meta.stroke}></rect>
  {/if}

  {#if selected}
    <rect class="node-selected" x={-w / 2 - 6} y={-h / 2 - 6} width={w + 12} height={h + 12}
      rx={node.type === "database" ? 12 : 14} fill="none" stroke={meta.stroke}></rect>
  {/if}

  <text class="node-label" x="0" y="2" text-anchor="middle">{label}{#if label !== node.name}<title>{node.name}</title>{/if}</text>
  <text class="node-sublabel" x="0" y={h / 2 - 8} text-anchor="middle">{meta.label}</text>

  {#if node.type === "service" && node.offersRest}
    <rect class="rest-badge-bg" x={w / 2 - 22} y={-h / 2 + 2} width="34" height="16" rx="8" stroke="var(--accent-rest)"></rect>
    <text class="rest-badge-text" x={w / 2 - 5} y={-h / 2 + 13.5} text-anchor="middle" fill="var(--accent-rest)">REST</text>
  {/if}

  {#each handles as hd (hd.type)}
    <g class="handle" style:color={hd.color} data-node={node.id} data-conntype={hd.type}
      transform="translate({w / 2 + 14},{hd.side * (h / 2 - 8)})" onmousedown={e => onHandleDown(e, hd.type)}>
      <circle class="handle-circle" r="9" fill={hd.color} stroke="#05070a" stroke-width="1.5"></circle>
      <text class="handle-label" text-anchor="middle" y="3">{hd.letter}</text>
    </g>
  {/each}

  {#if hasCycle}<Marker {ed} {node} kind="cycle" dx={hasOpenEnds ? -12 : 0} y={-h / 2 - 16} />{/if}
  {#if hasOpenEnds}<Marker {ed} {node} kind="open" dx={hasCycle ? 12 : 0} y={-h / 2 - 16} />{/if}
</g>
