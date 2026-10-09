<script lang="ts">
  import type { Editor } from "../editor.svelte";

  /* Eigene Dialoge statt window.confirm/alert — diese werden in manchen eingebetteten
     Umgebungen blockiert und würden die Aktion sonst stillschweigend abbrechen. */
  let { ed }: { ed: Editor } = $props();
  const MAX_ERRORS = 15;

  function yes() {
    const onYes = ed.confirm?.onYes;
    ed.confirm = null;
    onYes?.();
  }
</script>

<div id="confirmOverlay" class:show={ed.confirm}>
  <div id="confirmBox">
    <p id="confirmMsg">{ed.confirm?.message ?? ""}</p>
    <div class="btnrow">
      <button id="confirmNo" onclick={() => (ed.confirm = null)}>Abbrechen</button>
      <button id="confirmYes" onclick={yes}>Löschen</button>
    </div>
  </div>
</div>

<div id="errorOverlay" class:show={ed.errors}>
  <div id="errorBox">
    <h4 id="errorTitle">{ed.errors?.title ?? ""}</h4>
    <p id="errorMsg">{ed.errors?.message ?? ""}</p>
    {#if ed.errors?.items.length}
      <ul id="errorList">
        {#each ed.errors.items.slice(0, MAX_ERRORS) as item, i (i)}<li>{item}</li>{/each}
        {#if ed.errors.items.length > MAX_ERRORS}<li>… und {ed.errors.items.length - MAX_ERRORS} weitere Fehler.</li>{/if}
      </ul>
    {/if}
    <div class="btnrow">
      <button id="errorOk" onclick={() => (ed.errors = null)}>OK</button>
    </div>
  </div>
</div>
