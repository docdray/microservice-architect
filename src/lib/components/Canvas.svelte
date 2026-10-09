<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import NodeShape from "./NodeShape.svelte";
  import ConnectionShape from "./ConnectionShape.svelte";

  let { ed }: { ed: Editor } = $props();
  let svg: SVGSVGElement;

  $effect(() => {
    ed.svgEl = svg;
    // Nicht-passiv, damit das Scrollen der Seite verhindert werden kann
    const onWheel = (e: WheelEvent) => { e.preventDefault(); ed.zoomAt(e.clientX, e.clientY, e.deltaY); };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  });

  function onMouseDown(e: MouseEvent) {
    // Verschieben der Ansicht nur auf freier Fläche
    if (e.target === svg || (e.target as Element).id === "bgrect") ed.startPan(e);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svg id="canvas" bind:this={svg} class:panning={ed.interaction === "pan"} onmousedown={onMouseDown}>
  <defs>
    <pattern id="bgpattern" width="28" height="28" patternUnits="userSpaceOnUse">
      <rect width="28" height="28"></rect>
      <circle cx="1" cy="1" r="1" fill="#151c25"></circle>
    </pattern>
    <marker id="arrow-rest" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-rest)"></path>
    </marker>
    <marker id="arrow-event" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-event)"></path>
    </marker>
    <marker id="arrow-ws" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-ws)"></path>
    </marker>
    <marker id="arrow-ws-rev" viewBox="0 0 10 10" refX="1" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M10,0 L0,5 L10,10 z" fill="var(--accent-ws)"></path>
    </marker>
    <marker id="arrow-db" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--accent-dbconn)"></path>
    </marker>
    <marker id="arrow-temp" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#7c8899"></path>
    </marker>
  </defs>

  <rect id="bgrect" x="-20000" y="-20000" width="40000" height="40000" fill="url(#bgpattern)"></rect>

  <g id="world" transform="translate({ed.view.tx},{ed.view.ty}) scale({ed.view.scale})">
    <g id="connLayer">
      {#each ed.diagram.connections as conn (conn.id)}
        <ConnectionShape {ed} {conn} />
      {/each}
    </g>
    <g id="nodeLayer">
      {#each ed.diagram.nodes as node (node.id)}
        <NodeShape {ed} {node} />
      {/each}
    </g>
    <g id="tempLayer">
      {#if ed.tempConn}
        <path class="temp-conn" stroke={ed.tempConn.color} stroke-width="2.5" marker-end="url(#arrow-temp)" fill="none"
          d="M {ed.tempConn.from.x},{ed.tempConn.from.y} L {ed.tempConn.to.x},{ed.tempConn.to.y}"></path>
      {/if}
    </g>
    <g id="simLayer">
      {#each ed.sim.flights as f (f.id)}
        {@const w = Math.max(34, f.label.length * 6.4 + 16)}
        <g class="sim-event" transform="translate({f.x},{f.y})">
          <rect x={-w / 2} y="-11" width={w} height="22" rx="11" class="sim-event-bg"></rect>
          <text x="0" y="4" text-anchor="middle" class="sim-event-text">{f.label}</text>
        </g>
      {/each}
    </g>
  </g>
</svg>
