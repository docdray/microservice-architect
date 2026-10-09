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
    <button class="tbtn icon" id="btn-undo" title="Rückgängig (Strg+Z)" aria-label="Rückgängig" disabled={!ed.canUndo} onclick={() => ed.undo()}>↺</button>
    <button class="tbtn icon" id="btn-redo" title="Wiederholen (Strg+Y / Strg+Umschalt+Z)" aria-label="Wiederholen" disabled={!ed.canRedo} onclick={() => ed.redo()}>↻</button>
  </div>
  <div class="grp">
    <button class="tbtn" id="btn-export" title="Diagramm als JSON-Datei speichern" onclick={() => ed.exportFile()}>⭳ Export</button>
    <button class="tbtn" id="btn-import" title="Diagramm aus JSON-Datei laden" onclick={() => fileInput.click()}>⭱ Import</button>
    <input type="file" id="file-import" accept="application/json" style="display:none;" bind:this={fileInput} onchange={onFile}>
  </div>
  <div class="grp">
    <button class="tbtn icon" id="btn-reset-view" title="Ansicht zurücksetzen" aria-label="Ansicht zurücksetzen" onclick={() => ed.resetView()}>⤢</button>
    <button class="tbtn icon" id="btn-clear" title="Alles löschen" aria-label="Alles löschen" onclick={() => ed.clearAll()}>🗑</button>
  </div>
  <div class="grp">
    <button class="tbtn icon" id="btn-sim-stop" title="Simulation stoppen" aria-label="Simulation stoppen" onclick={() => ed.sim.stop()}>⏹</button>
  </div>
</div>
