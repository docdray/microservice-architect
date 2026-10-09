<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import type { Connection } from "../model/types";
  import { getNode } from "../model/diagram";
  import { CONN_META } from "../ui/meta";

  let { ed, conn }: { ed: Editor; conn: Connection } = $props();
  const isWs = $derived(conn.type === "rest" && conn.websocket);
  const color = $derived(isWs ? "var(--accent-ws)" : CONN_META[conn.type].color);
  const route = $derived((getNode(ed.diagram, conn.from)?.name ?? "?") + "  →  " + (getNode(ed.diagram, conn.to)?.name ?? "?"));
</script>

<h3>Verbindung bearbeiten</h3>
<span class="typebadge" style:color={color}><span class="dot" style:background={color}></span>{isWs ? "WEBSOCKET" : CONN_META[conn.type].label}</span>
<div class="hint" style="margin-top:10px;">{route}</div>

<label for="sb-conn-desc">Beschreibung</label>
<textarea id="sb-conn-desc" bind:value={conn.description} placeholder="z. B. GET /orders, OrderCreated-Event …"></textarea>

{#if conn.type === "rest"}
  <div class="checkline">
    <input type="checkbox" id="cb-ws" bind:checked={conn.websocket}>
    <label for="cb-ws" style="margin:0;text-transform:none;">WebSocket-Verbindung (Sonderfall von REST)</label>
  </div>
{/if}

<button class="del-btn" onclick={() => ed.deleteConnection(conn.id)}>Verbindung löschen</button>
