<script lang="ts">
  import type { Editor } from "../editor.svelte";

  let { ed }: { ed: Editor } = $props();
  let fileInput: HTMLInputElement;

  function onFile(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    if (file) ed.importFile(file);
    e.currentTarget.value = "";
  }
</script>

<div id="toolbar">
  <div class="grp">
    <button class="tbtn" id="btn-add-service" onclick={() => ed.addNode("service")}><span class="dot" style="background:var(--accent-service)"></span>+ Service</button>
    <button class="tbtn" id="btn-add-frontend" onclick={() => ed.addNode("frontend")}><span class="dot" style="background:var(--accent-frontend)"></span>+ Frontend</button>
    <button class="tbtn" id="btn-add-db" onclick={() => ed.addNode("database")}><span class="dot" style="background:var(--accent-db)"></span>+ Datenbank</button>
  </div>
  <div class="grp">
    <button class="tbtn" id="btn-undo" title="Rückgängig (Strg+Z)" disabled={!ed.canUndo} onclick={() => ed.undo()}>↶ Rückgängig</button>
    <button class="tbtn" id="btn-redo" title="Wiederholen (Strg+Y / Strg+Umschalt+Z)" disabled={!ed.canRedo} onclick={() => ed.redo()}>↷ Wiederholen</button>
  </div>
  <div class="grp">
    <button class="tbtn" id="btn-export" onclick={() => ed.exportFile()}>⭳ Export JSON</button>
    <button class="tbtn" id="btn-import" onclick={() => fileInput.click()}>⭱ Import JSON</button>
    <input type="file" id="file-import" accept="application/json" style="display:none;" bind:this={fileInput} onchange={onFile}>
  </div>
  <div class="grp">
    <button class="tbtn" id="btn-reset-view" onclick={() => ed.resetView()}>⤢ Ansicht zurücksetzen</button>
    <button class="tbtn" id="btn-clear" onclick={() => ed.clearAll()}>🗑 Alles löschen</button>
  </div>
  <div class="grp">
    <button class="tbtn" id="btn-sim-stop" onclick={() => ed.sim.stop()}>⏹ Simulation stoppen</button>
  </div>
</div>
