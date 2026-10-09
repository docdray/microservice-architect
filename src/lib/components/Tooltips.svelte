<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import { cyclePathFrom } from "../model/eventGraph";
  import { openEndText } from "../model/openEnds";
  import { eventLabel } from "../model/types";

  let { ed }: { ed: Editor } = $props();

  const MAX_ITEMS = 10;
  const tip = $derived(ed.markerTip);
  const cycles = $derived(tip?.kind === "cycle" ? ed.cycles.filter(c => c.nodeIds.has(tip.nodeId)) : []);
  const openItems = $derived(tip?.kind === "open" ? ed.openEnds.get(tip.nodeId) ?? [] : []);
  /* Verschwindet der Marker (z. B. Zyklus aufgelöst), bleibt kein leerer Tooltip stehen */
  const showMarkerTip = $derived(!!tip && (cycles.length > 0 || openItems.length > 0));
</script>

<div id="tooltip" class:show={ed.descTip} style:left="{ed.descTip?.x ?? 0}px" style:top="{ed.descTip?.y ?? 0}px">{ed.descTip?.text ?? ""}</div>

<div id="cycle-tooltip" class:show={showMarkerTip} style:left="{tip?.x ?? 0}px" style:top="{tip?.y ?? 0}px">
  {#if tip?.kind === "cycle"}
    {#each cycles as cycle, i (i)}
      {@const path = cyclePathFrom(cycle, tip.nodeId)}
      <h5>⚠ Zyklus erkannt</h5>
      <ol>
        {#each path.slice(0, MAX_ITEMS) as step, j (j)}
          <li>{step.from.node.name}: <span class="ev-name">{eventLabel(step.from.ev)}</span> → {step.to.node.name}</li>
        {/each}
      </ol>
      {#if path.length > MAX_ITEMS}
        <div class="more">… und {path.length - MAX_ITEMS} weitere Events</div>
      {/if}
    {/each}
  {:else if tip?.kind === "open"}
    <h5 class="open-ends">Offene Enden</h5>
    <ul>
      {#each openItems.slice(0, MAX_ITEMS) as item, j (j)}
        <li><span class="ev-name">{eventLabel(item.ev)}</span>: {openEndText(item)}</li>
      {/each}
    </ul>
    {#if openItems.length > MAX_ITEMS}
      <div class="more">… und {openItems.length - MAX_ITEMS} weitere</div>
    {/if}
  {/if}
</div>
