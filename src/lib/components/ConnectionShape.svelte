<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { Connection } from "../model/types";
  import { connEndpoints, smallLabelWidth } from "../model/geometry";
  import { CONN_META } from "../ui/meta";

  let { ed, conn }: { ed: Editor; conn: Connection } = $props();

  const ep = $derived(connEndpoints(ed.diagram, conn));
  const meta = $derived(CONN_META[conn.type]);
  const isWs = $derived(conn.type === "rest" && conn.websocket);
  const color = $derived(isWs ? "var(--accent-ws)" : meta.color);
  const selected = $derived(ed.selection?.kind === "conn" && ed.selection.id === conn.id);
  const d = $derived(ep ? `M ${ep.p1.x},${ep.p1.y} L ${ep.p2.x},${ep.p2.y}` : "");
  const MAX_LABEL = 34;
  const label = $derived(conn.description.length > MAX_LABEL ? conn.description.slice(0, MAX_LABEL - 1) + "…" : conn.description);
  const labelWidth = $derived(Math.max(40, smallLabelWidth(label)));
</script>

{#if ep}
  {@const mx = (ep.p1.x + ep.p2.x) / 2}
  {@const my = (ep.p1.y + ep.p2.y) / 2}
  <g class="conn" class:conn-glow={ed.glowConns.includes(conn.id)} data-id={conn.id}>
    <path id="path_{conn.id}" {d} stroke={color} stroke-width={selected ? 3 : 2}
      stroke-dasharray={isWs ? "7 5" : meta.dash} class="conn-path" class:conn-selected={selected}
      marker-end={isWs ? "url(#arrow-ws)" : meta.marker} marker-start={isWs ? "url(#arrow-ws-rev)" : undefined}
      style:color={selected ? color : undefined}></path>
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <path class="conn-hit" {d} onmousedown={e => e.stopPropagation()}
      onclick={e => { e.stopPropagation(); ed.selectConnection(conn.id); }}></path>

    <!-- Brief-Animation nur bei Event-Verbindungen -->
    {#if conn.type === "event"}
      <text class="envelope" text-anchor="middle">✉<animateMotion dur="2.6s" repeatCount="indefinite" rotate="0"
        keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#path_{conn.id}"></mpath></animateMotion></text>
    {/if}

    {#if conn.description}
      <rect class="conn-label-bg" x={mx - labelWidth / 2} y={my - 10} width={labelWidth} height="20" rx="5"></rect>
      <text class="conn-label-text" x={mx} y={my + 4} text-anchor="middle">{label}</text>
    {/if}
  </g>
{/if}
