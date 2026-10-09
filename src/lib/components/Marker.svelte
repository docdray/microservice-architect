<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { DiagramNode } from "../model/types";

  /* Warnkreis über einem Element: "!" = Zyklus, "?" = offene Enden */
  let { ed, node, kind, dx, y }: { ed: Editor; node: DiagramNode; kind: "cycle" | "open"; dx: number; y: number } = $props();

  /* Beim Hover über einen Zyklus-Marker glühen die Marker aller Elemente desselben Zyklus */
  const glowing = $derived.by(() => {
    const tip = ed.markerTip;
    if (kind !== "cycle" || tip?.kind !== "cycle") return false;
    return ed.cycles.some(c => c.nodeIds.has(tip.nodeId) && c.nodeIds.has(node.id));
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g class="{kind}-marker" class:cycle-glow={glowing} data-node={node.id} transform="translate({dx},{y})"
  onmouseenter={e => ed.showMarkerTip(kind, node.id, e.currentTarget)} onmouseleave={() => (ed.markerTip = null)}>
  <circle r="9"></circle>
  <text text-anchor="middle" y="4.5">{kind === "cycle" ? "!" : "?"}</text>
</g>
