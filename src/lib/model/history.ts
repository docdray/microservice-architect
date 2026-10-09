/* Verlauf für Rückgängig/Wiederholen auf Basis von Schnappschüssen (JSON-Strings).
   Kennt nur Strings — was ein Schnappschuss ist, entscheidet der Aufrufer. */
export class History {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private current: string | null = null;

  constructor(private readonly max = 200) {}

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /* Erfasst einen Zustand. Liefert true, wenn ein neuer Schritt entstanden ist. */
  commit(snapshot: string): boolean {
    if (snapshot === this.current) return false;
    const first = this.current === null;
    if (!first) {
      this.undoStack.push(this.current!);
      if (this.undoStack.length > this.max) this.undoStack.shift();
      this.redoStack = [];
    }
    this.current = snapshot;
    return !first;
  }

  /* Liefert den wiederherzustellenden Zustand oder null. */
  undo(): string | null {
    const prev = this.undoStack.pop();
    if (prev === undefined) return null;
    this.redoStack.push(this.current!);
    this.current = prev;
    return prev;
  }

  redo(): string | null {
    const next = this.redoStack.pop();
    if (next === undefined) return null;
    this.undoStack.push(this.current!);
    this.current = next;
    return next;
  }
}
