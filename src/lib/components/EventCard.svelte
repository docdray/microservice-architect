<script lang="ts">
  import { untrack } from "svelte";
  import type { Editor } from "../editor.svelte";
  import { BUTTON_TRIGGER, type DiagramEvent, type DiagramNode } from "../model/types";
  import { collectTriggerSuggestions, eventTargetOptions } from "../model/diagram";
  import { orphanedTriggers } from "../model/editing";
  import { openEndText, targetStatus, triggerStatus } from "../model/openEnds";
  import TargetDropdown from "./TargetDropdown.svelte";

  let { ed, node, ev, onDelete }: { ed: Editor; node: DiagramNode; ev: DiagramEvent; onDelete: () => void } = $props();
  const isDb = $derived(node.type === "database");

  /* ---------- Name ----------
     Erst beim Abschluss der Eingabe (Enter / Feld verlassen) werden Leerzeichen am Rand
     entfernt. Trigger, die auf den bisherigen Namen hören, bleiben unverändert (offene
     Enden) — ein Hinweis bietet an, sie mit umzubenennen. */
  let nameBeforeEdit = untrack(() => ev.name); // wird bei jedem Fokus neu gesetzt
  /* ursprünglicher Name, auf den noch Trigger hören (auch über mehrere Umbenennungen) */
  let orphanFrom = $state<string | null>(null);
  const orphans = $derived(orphanedTriggers(ed.diagram, ev, orphanFrom));

  function commitName(input: HTMLInputElement) {
    const newName = input.value.trim();
    if (!newName) {
      ev.name = input.value = nameBeforeEdit;
      ed.toast("Der Event-Name darf nicht leer sein.");
      return;
    }
    ev.name = input.value = newName;
    if (!orphanFrom || !orphanedTriggers(ed.diagram, ev, orphanFrom).length) orphanFrom = nameBeforeEdit;
    nameBeforeEdit = newName;
  }

  function renameOrphans() {
    const list = orphans;
    for (const o of list) o.ev.trigger = ev.name;
    ed.toast(list.length === 1
      ? "1 Trigger wurde auf „" + ev.name + "“ umbenannt."
      : list.length + " Trigger wurden auf „" + ev.name + "“ umbenannt.");
    orphanFrom = null;
  }

  /* ---------- Trigger ---------- */
  let select: HTMLSelectElement | undefined = $state();
  let newTriggerOpen = $state(false);
  let newTrigger = $state("");
  const suggestions = $derived(collectTriggerSuggestions(ed.diagram, node));
  /* Gesetzter Trigger, der nicht (mehr) in den Vorschlägen steht, bleibt wählbar */
  const extraTrigger = $derived(ev.trigger && ev.trigger !== BUTTON_TRIGGER && !suggestions.includes(ev.trigger) ? ev.trigger : null);
  const selectValue = $derived(ev.trigger && ev.trigger !== BUTTON_TRIGGER ? ev.trigger : isDb ? "" : BUTTON_TRIGGER);
  const trigWarning = $derived(triggerStatus(ed.diagram, node, ev, ed.graph));

  function onTriggerChange(value: string) {
    if (value === "__new__") {
      newTrigger = "";
      newTriggerOpen = true;
    } else {
      newTriggerOpen = false;
      ev.trigger = value;
    }
  }
  function commitNewTrigger() {
    if (!newTriggerOpen) return; // Enter und anschließendes Blur nur einmal verarbeiten
    newTriggerOpen = false;
    const v = newTrigger.trim();
    if (v) ev.trigger = v;
    else if (select) select.value = selectValue;
  }
  const focusOnMount = (el: HTMLElement) => { el.focus(); };

  /* ---------- Ziele ---------- */
  const options = $derived(eventTargetOptions(ed.diagram, node));
  /* Ziele, die nicht (mehr) erreichbar sind, bleiben als offene Enden auswählbar */
  const openTargets = $derived(ev.targetIds
    .filter(id => !options.some(o => o.node.id === id))
    .map(id => ({ id, status: targetStatus(ed.diagram, node, id) }))
    .filter((o): o is { id: string; status: NonNullable<typeof o.status> } => o.status !== null));
</script>

<div class="event-card">
  <input type="text" class="event-name-input" value={ev.name} placeholder="Event-Name"
    onfocus={() => (nameBeforeEdit = ev.name)}
    oninput={e => (ev.name = e.currentTarget.value)}
    onchange={e => commitName(e.currentTarget)}
    onkeydown={e => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}>

  {#if orphans.length}
    <div class="rename-hint">
      <div>{orphans.length === 1 ? "1 Trigger hört" : orphans.length + " Trigger hören"} noch auf „{orphanFrom}“.</div>
      <button type="button" class="tbtn" onclick={renameOrphans}>Trigger mit umbenennen</button>
    </div>
  {/if}

  {#if node.type === "frontend"}
    <div class="hint" style="margin-top:6px;">Trigger: nur Button (manuell)</div>
  {:else}
    <div class="hint" style="margin-top:8px;">Trigger:</div>
    <select class="event-trigger-select" bind:this={select} value={selectValue} onchange={e => onTriggerChange(e.currentTarget.value)}>
      {#if isDb}
        {#if !ev.trigger || ev.trigger === BUTTON_TRIGGER}<option value="">— Trigger wählen —</option>{/if}
      {:else}
        <option value={BUTTON_TRIGGER}>Nur Button (manuell)</option>
      {/if}
      {#each suggestions as name (name)}<option value={name}>{name}</option>{/each}
      {#if extraTrigger}<option value={extraTrigger}>{extraTrigger}</option>{/if}
      <option value="__new__">+ Neuer Trigger …</option>
    </select>
    {#if newTriggerOpen}
      <div style="margin-top:6px;">
        <input type="text" class="event-newtrigger-input" placeholder="Neuer Trigger-Name …" bind:value={newTrigger}
          {@attach focusOnMount} onblur={commitNewTrigger}
          onkeydown={e => { if (e.key === "Enter") { e.preventDefault(); commitNewTrigger(); } }}>
      </div>
    {/if}
    {#if trigWarning}
      <div class="hint warn-text" style="margin-top:6px;">⚠ {openEndText({ ...trigWarning, trigger: ev.trigger })}</div>
    {/if}
  {/if}

  {#if isDb}
    <div class="hint" style="margin-top:10px;">Ziel: automatisch der Absender der eingehenden Anfrage (Antwort). Keine eigene Auswahl nötig.</div>
  {:else}
    <div class="hint" style="margin-top:10px;">Ziele (abgehende Verbindungen + Antwortweg eingehender REST-Anfragen):</div>
    {#if !options.length && !openTargets.length}
      <div class="hint">Keine verfügbaren Ziele vorhanden.</div>
    {:else}
      <TargetDropdown {ed} {node} {ev} {options} {openTargets} />
    {/if}
  {/if}

  <div class="event-btnrow">
    {#if !isDb}<button class="tbtn ev-start" onclick={() => ed.sim.start(node, ev)}>▶ Start</button>{/if}
    <button class="tbtn ev-del" onclick={onDelete}>🗑</button>
  </div>
</div>
