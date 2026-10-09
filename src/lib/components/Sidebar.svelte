<script lang="ts">
  import type { Editor } from "../editor.svelte";
  import NodeSidebar from "./NodeSidebar.svelte";
  import ConnSidebar from "./ConnSidebar.svelte";

  let { ed }: { ed: Editor } = $props();
  const node = $derived(ed.selectedNode);
  const conn = $derived(ed.selectedConnection);
</script>

<div id="sidebar" class:show={node || conn}>
  <button class="closebtn" id="sb-close" onclick={() => ed.deselect()}>✕</button>
  <div id="sb-content">
    {#if node}
      {#key node.id}<NodeSidebar {ed} {node} />{/key}
    {:else if conn}
      {#key conn.id}<ConnSidebar {ed} {conn} />{/key}
    {/if}
  </div>
</div>
