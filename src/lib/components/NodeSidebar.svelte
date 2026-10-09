<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { DiagramNode } from "../model/types";
  import { hasIncomingRest } from "../model/diagram";
  import { deleteEvent } from "../model/editing";
  import { TYPE_META } from "../ui/meta";
  import EventCard from "./EventCard.svelte";

  let { ed, node }: { ed: Editor; node: DiagramNode } = $props();
  const meta = $derived(TYPE_META[node.type]);
  /* Solange REST-Verbindungen zum Service bestehen, bleibt die Schnittstelle an. */
  const restLocked = $derived(node.offersRest && hasIncomingRest(ed.diagram, node));

  const eventsHint = $derived(node.type === "frontend"
    ? "Frontend-Events lassen sich ausschließlich manuell per „▶ Start“ auslösen."
    : node.type === "database"
      ? "Datenbank-Events lösen automatisch aus, sobald ein passendes Trigger-Event eintrifft, und antworten dann direkt an dessen Absender — ein eigenes Ziel ist bei Datenbanken nicht wählbar."
      : "Trigger „Nur Button“ = ausschließlich manueller Start. Andernfalls startet das Event automatisch, sobald am Element ein Event mit exakt diesem Namen eintrifft.");
</script>

<h3>Element bearbeiten</h3>
<span class="typebadge" style:color={meta.stroke}><span class="dot" style:background={meta.stroke}></span>{meta.label}</span>

<label for="sb-name">Name</label>
<input id="sb-name" type="text" bind:value={node.name}>

<label for="sb-desc">Beschreibung (Sprechblase beim Hover)</label>
<textarea id="sb-desc" bind:value={node.description} placeholder="Wird beim Überfahren des Elements mit der Maus angezeigt …"></textarea>

{#if node.type === "service"}
  <div class="checkline">
    <input type="checkbox" id="cb-rest" bind:checked={node.offersRest} disabled={restLocked}>
    <label for="cb-rest" style="margin:0;text-transform:none;">Bietet REST-Schnittstelle an</label>
  </div>
  <div class="hint">
    {restLocked
      ? "Wird als REST-Badge am Element angezeigt. Lässt sich erst abschalten, wenn keine REST-Verbindungen zu diesem Service mehr bestehen."
      : "Wird als REST-Badge am Element angezeigt. Nur Services mit REST-Schnittstelle können REST-Verbindungen annehmen."}
  </div>
{:else if node.type === "frontend"}
  <div class="hint" style="margin-top:10px;">Ein Frontend bietet selbst keine REST-Schnittstelle an und kann keine Event-Verbindung haben — es kann aber REST-Verbindungen zu Services mit REST-Schnittstelle aufbauen.</div>
{/if}

<div class="hint" style="margin-top:14px;">Ziehen an den kleinen Punkten (R = REST, E = Event) erstellt eine Verbindung zu einem anderen Element. Element im Body verschieben durch Klicken &amp; Ziehen.</div>

<!-- svelte-ignore a11y_label_has_associated_control -->
<label style="margin-top:18px;">Events (Simulator)</label>
<div>
  {#each node.events as ev (ev.id)}
    <EventCard {ed} {node} {ev} onDelete={() => deleteEvent(node, ev.id)} />
  {/each}
</div>
<button class="tbtn add-event-btn" onclick={() => ed.addEvent(node)}>+ Event hinzufügen</button>
<div class="hint" style="margin-top:8px;">{eventsHint}</div>

<button class="del-btn" onclick={() => ed.deleteNode(node.id)}>Element löschen</button>
