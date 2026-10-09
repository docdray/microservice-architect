<script lang="ts">
  import { onMount } from "svelte";
  import { Editor } from "./lib/editor.svelte";
  import Canvas from "./lib/components/Canvas.svelte";
  import Toolbar from "./lib/components/Toolbar.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import Dialogs from "./lib/components/Dialogs.svelte";
  import Tooltips from "./lib/components/Tooltips.svelte";
  import Legend from "./lib/components/Legend.svelte";

  const ed = new Editor();

  const isTextField = (el: Element | null) =>
    !!el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "text"));

  onMount(() => {
    // Rückgängig-Erfassung nach jeder abgeschlossenen Benutzeraktion (Capture-Phase,
    // damit sie auch bei gestoppter Propagation greift)
    const schedule = () => ed.scheduleCommit();
    const onInput = (e: Event) => { if (isTextField(e.target as Element)) ed.markTextDirty(); };
    const onKeyCapture = (e: KeyboardEvent) => {
      // In Textfeldern gilt das Rückgängig des Browsers; Tippen wird erst bei "change" erfasst.
      if (isTextField(document.activeElement)) return;
      ed.scheduleCommit();
      if (ed.confirm || ed.errors) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) { e.preventDefault(); ed.undo(); }
      else if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); ed.redo(); }
    };
    /* Entf/Backspace löscht die Auswahl — außer die Taste gilt einem Bedienelement:
       Eingabefelder, Auswahllisten, alles in der Seitenleiste, oder ein offener Dialog. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (ed.confirm || ed.errors) return;
      const active = document.activeElement;
      if (active && (["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName) || active.closest("#sidebar"))) return;
      ed.deleteSelected();
    };
    const captureTypes = ["click", "change", "mouseup"] as const;
    captureTypes.forEach(t => window.addEventListener(t, schedule, true));
    window.addEventListener("input", onInput, true);
    window.addEventListener("keydown", onKeyCapture, true);
    window.addEventListener("keydown", onKey);
    ed.commitHistory();
    return () => {
      captureTypes.forEach(t => window.removeEventListener(t, schedule, true));
      window.removeEventListener("input", onInput, true);
      window.removeEventListener("keydown", onKeyCapture, true);
      window.removeEventListener("keydown", onKey);
    };
  });
</script>

<Canvas {ed} />
<Toolbar {ed} />
<div id="hint-toast" style:display={ed.toastVisible ? "block" : "none"}>{ed.toastMsg}</div>
<Tooltips {ed} />
<Dialogs {ed} />
<Sidebar {ed} />
<Legend />
<div id="zoomlabel">Zoom: <span id="zoomval">{Math.round(ed.view.scale * 100)}%</span></div>
