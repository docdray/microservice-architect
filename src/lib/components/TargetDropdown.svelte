<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { DiagramEvent, DiagramNode } from "../model/types";
  import type { TargetStatus } from "../model/openEnds";
  import { findConnectionForTravel } from "../model/diagram";
  import { toggleTarget } from "../model/editing";

  /* Kompaktes Mehrfachauswahl-Dropdown für die Event-Ziele. Beim Hovern über einen Eintrag
     glühen Zielelement und Verbindung im Diagramm auf. */
  let { ed, node, ev, options, openTargets }: {
    ed: Editor; node: DiagramNode; ev: DiagramEvent;
    options: Array<{ node: DiagramNode; response: boolean }>;
    openTargets: Array<{ id: string; status: TargetStatus }>;
  } = $props();

  let wrap: HTMLDivElement;
  const open = $derived(ed.openDropdown === ev.id);

  /* Abgehakte offene Ziele bleiben sichtbar, solange die Karte besteht — so lassen sie sich
     wieder anhaken. */
  const remembered = new Map<string, TargetStatus>(); // bewusst nicht reaktiv — nur Gedächtnis
  const openRows = $derived.by(() => {
    for (const o of openTargets) remembered.set(o.id, o.status);
    // Ziele, die inzwischen wieder regulär erreichbar sind, nicht mehr als offen zeigen
    return [...remembered]
      .filter(([id]) => !options.some(o => o.node.id === id))
      .map(([id, status]) => ({ id, status }));
  });

  const label = $derived.by(() => {
    const chosen = options.filter(o => ev.targetIds.includes(o.node.id));
    const chosenOpen = openTargets.filter(o => ev.targetIds.includes(o.id));
    const total = chosen.length + chosenOpen.length;
    const text = !total ? "Ziele wählen …"
      : total === 1 ? (chosen.length ? chosen[0]!.node.name : "⚠ " + chosenOpen[0]!.status.name)
      : total + " Ziele ausgewählt" + (chosenOpen.length ? " (⚠ " + chosenOpen.length + " offen)" : "");
    return { text, warn: chosenOpen.length > 0 };
  });

  $effect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => { if (!wrap.contains(e.target as Node)) ed.openDropdown = null; };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  });

  function glow(targetId: string, on: boolean, withConnection = true) {
    ed.glowNodes = on ? [targetId] : [];
    const hop = withConnection ? findConnectionForTravel(ed.diagram, node.id, targetId) : null;
    ed.glowConns = on && hop ? [hop.conn.id] : [];
  }
</script>

<div class="target-dropdown" bind:this={wrap}>
  <button type="button" class="target-dropdown-btn" class:warn-text={label.warn}
    onclick={e => { e.stopPropagation(); ed.openDropdown = open ? null : ev.id; }}>{label.text}</button>
  <div class="target-dropdown-panel" style:display={open ? "block" : "none"}>
    {#each options as opt (opt.node.id)}
      <label class="target-dd-row" onmouseenter={() => glow(opt.node.id, true)} onmouseleave={() => glow(opt.node.id, false)}>
        <input type="checkbox" checked={ev.targetIds.includes(opt.node.id)} onchange={e => toggleTarget(ev, opt.node.id, e.currentTarget.checked)}>
        <span>{opt.node.name + (opt.response ? " (Antwort ← REST)" : "")}</span>
      </label>
    {/each}
    {#each openRows as row (row.id)}
      <label class="target-dd-row open"
        onmouseenter={() => row.status.kind === "unreachable" && glow(row.id, true, false)}
        onmouseleave={() => row.status.kind === "unreachable" && glow(row.id, false, false)}>
        <input type="checkbox" checked={ev.targetIds.includes(row.id)} onchange={e => toggleTarget(ev, row.id, e.currentTarget.checked)}>
        <span>{row.status.kind === "deleted" ? "⚠ gelöscht: " + row.status.name : "⚠ " + row.status.name + " (keine Verbindung)"}</span>
      </label>
    {/each}
  </div>
</div>
