export interface KeyboardTrackerOptions {
  /** Maximum time in ms between keystrokes before the sequence buffer c;ears. Default 1000 */
  sequenceTimeout?: number;
}

export type ComboCallback = (event: KeyboardEvent) => void;
export type SequenceCallback = (sequence: string[]) => void;

interface RegisteredCombo {
  keys:            string[];
  callback:        ComboCallback;
  rawString:       string;
  preventDefault?: boolean;
  strict?:         boolean;
}

interface RegisteredSequence {
  keys:     string[];
  callback: SequenceCallback;
  rawKeys:  string[];
}

// Map common key names to native DOM KeyboardEvent.key values (lowercased)
const KEY_ALIASES: Record<string, string> = {
  "space":    " ",
  "spacebar": " ",
  "ctrl":     "control",
  "cmd":      "meta",
  "win":      "meta",
  "command":  "meta",
  "esc":      "escape",
  "ret":      "enter",
  "return":   "enter",
  "up":       "arrowup",
  "down":     "arrowdown",
  "left":     "arrowleft",
  "right":    "arrowright",
  "plus":     "+",
  "minus":    "-",
  "dot":      ".",
};

export class KeyboardTracker {

  public isDestroyed = false;
  /** If false, the tracker ignores all keystrokes without losing its registered events */
  public isEnabled = true;

  private activeKeys = new Set<string>();
  private combos:    RegisteredCombo[] = [];
  private sequences: RegisteredSequence[] = [];
  
  // private sequenceKeysCache = new Set<string>();
  private sequenceBuffer:  string[] = [];
  private lastKeyPressTime = 0;
  private sequenceTimeout: number;
  private maxSequenceLength = 0;

  constructor(options: KeyboardTrackerOptions = {}) {
    this.sequenceTimeout = options.sequenceTimeout ?? 1000;
    this.initListeners();
  }

  private initListeners(): void {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private removeListeners(): void {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }

  private standardizeKey(key: string): string {
    const k = key.toLowerCase();
    return KEY_ALIASES[k] || k;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isEnabled || this.isDestroyed) return;

    // Prevent interception if the user is typing inside native inputs
    const target = e.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT" ||
      target.isContentEditable
    ) return;

    // Ignore OS-level key hold repetitions
    if (e.repeat) return;
    
    const key = this.standardizeKey(e.key);
    this.activeKeys.add(key);

    const now = performance.now();
    // Time-based buffer cleanup (Zero allocation mutation)
    if (now - this.lastKeyPressTime > this.sequenceTimeout) {
      this.sequenceBuffer.length = 0;
    }
    
    this.sequenceBuffer.push(key);
    this.lastKeyPressTime = now;

    // Cap the buffer size to prevent memory leaks from key spamming.
    // Note: Array.shift() is O(n), but since maxSequenceLength is typically small (< 20),
    // the performance impact is mathematically negligible compared to implementing a RingBuffer here.
    if (this.maxSequenceLength > 0 && this.sequenceBuffer.length > this.maxSequenceLength * 2) {
      this.sequenceBuffer.shift(); 
    }

    this.checkCombos(e);
    this.checkSequences();
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    if (this.isDestroyed) return;
    this.activeKeys.delete(this.standardizeKey(e.key));
  };

  private handleBlur = () => {
    // When the window loses focus, we assume all keys were released
    this.activeKeys.clear();
    this.sequenceBuffer.length = 0;
  };

  /**
   * Registers a combination of keys pressed simultaneously (e.g., "ctrl+shift+s").
   * @param comboStr The combination string, separated by '+'. (for '+' use 'plus')
   * @param callback Function to execute when the combo is matched
   * @param options Configuration options. preventDefault is true by default. strict requires EXACT match.
   * @returns A cleanup function to unregister the combo.
   */
  public onCombo(comboStr: string, callback: ComboCallback, options: { preventDefault?: boolean; strict?: boolean } = {}): () => void {
    const rawParts = comboStr.split("+");
    const keys = rawParts
      .map((k) => this.standardizeKey(k.trim()))
      .filter(Boolean);

    if (keys.length === 0) {
      console.warn(`Affer KeyboardTracker: Combo "${comboStr}" is empty and was ignored.`);
      return () => {};
    }

    if (keys.length !== rawParts.length) {
      console.warn(`Affer KeyboardTracker: Malformed combo string "${comboStr}". Avoid trailing '+' or use aliases like "plus" to prevent parsing errors.`);
      return () => {};
    }

    const comboObj: RegisteredCombo ={
      keys,
      callback,
      rawString:      comboStr,
      preventDefault: options.preventDefault ?? true,
      strict:         options.strict ?? false,
    };

    this.combos.push(comboObj);

    return () => { // For React/Vue unmounts
      if (this.isDestroyed) return;
      const idx = this.combos.indexOf(comboObj);
      if (idx !== -1) this.combos.splice(idx, 1);
    };
  }

  /**
   * Registers a sequence of keys pressed in order within a time limit
   * Note: If multiple registered sequences share the same suffix  (e.g., ["a","b","c"] and ["b","c"]),
   * the one registered first will take precedence.
   * @param keysArray Array of keys in the required order.
   * @param callback Function to execute when the sequence is completed.
   * @returns A cleanup function to unregister the sequence.
   */
  public onSequence(keysArray: string[], callback: SequenceCallback): () => void {
    const standardizedKeys = keysArray.map((k) => this.standardizeKey(k));

    const seqObj: RegisteredSequence = {
      keys:    standardizedKeys,
      callback,
      rawKeys: keysArray,
    };

    this.sequences.push(seqObj);
    this.updateMaxSequenceLength();

    return () => {
      if (this.isDestroyed) return;
      const idx = this.sequences.indexOf(seqObj);
      if (idx !== -1) {
        this.sequences.splice(idx, 1);
        this.updateMaxSequenceLength();
      }
    };
  }

  private updateMaxSequenceLength(): void {
    let max = 0;
    const len = this.sequences.length;
    for (let i = 0; i < len; i++) {
      if (this.sequences[i].keys.length > max) max = this.sequences[i].keys.length;
    }
    this.maxSequenceLength = max;
  }

  private checkCombos(e: KeyboardEvent): void {
    const comboLen = this.combos.length;
    const currentActiveSize = this.activeKeys.size;
    
    for (let i = 0; i < comboLen; i++) {
      const combo = this.combos[i];
      const keys = combo.keys;
      const keyCount = keys.length;

      if (combo.strict && currentActiveSize !== keyCount) {
        continue;
      }

      let allActive = true;
      
      for (let j = 0; j < keyCount; j++) {
        if (!this.activeKeys.has(keys[j])) {
          allActive = false;
          break;
        }
      }

      if (allActive) {
        if (combo.preventDefault) e.preventDefault();
        combo.callback(e);
      }
    }
  }

  private checkSequences(): void {
    const bufLen = this.sequenceBuffer.length;
    if (bufLen === 0) return;

    const seqCount = this.sequences.length;

    for (let i = 0; i < seqCount; i++) {
      const seq = this.sequences[i];
      const seqLen = seq.keys.length;

      if (bufLen < seqLen) continue;

      let isMatch = true;
      // Reverse scan to check the ende of the buffer without slicing memory
      for (let j = 0; j < seqLen; j++) {
        if (this.sequenceBuffer[bufLen - seqLen + j] !== seq.keys[j]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        seq.callback(seq.keys);
        this.sequenceBuffer.length = 0; // Clear buffer so it doesn't trigger repeatedly
        break;
      }
    }
  }

  /** Temporarily pauses the tracker. Keystrokes will be ignored. */
  public pause(): void { this.isEnabled = false; }

  /** Resumes tracking keystrokes. */
  public resume(): void { this.isEnabled = true; }

  /** Checks if a specific key is currently held down */
  public isPressed(key: string): boolean { return this.activeKeys.has(this.standardizeKey(key)); }

  /** Return the exact amount of keys currently held down */
  public get pressedCount(): number { return this.activeKeys.size; }

  /** * Returns a read-only Set of the active keys.
   * Ideal for zero-alloc checks inside a rAF / Frame loop.
   */
  public get activeKeysSet(): ReadonlySet<string> { return this.activeKeys; }

  /** * Retrieves an array of all keys currently held down.
   * Note: This allocates a new array on every call. Use activeKeysSet in frame loops.
   */
  public getPressedKeysArray(): string[] { return Array.from(this.activeKeys); }

  /** Retrieves a copy of the current sequence history buffer */
  public getSequenceBuffer(): string[] { return [...this.sequenceBuffer]; }

  /**
   * Returns a snapshot array.
   * Allocates a new array on every call.
   * Intended for debugging/inspection only.
   */
  public get registeredCombos(): string[] { return this.combos.map((c) => c.rawString); }

  /** Returns an array of raw strings representing the registered sequences */
  public get registeredSequences(): string[][] { return this.sequences.map((s) => s.rawKeys); }

  /** Manually flushes the sequence buffer */
  public clearSequenceBuffer(): void { this.sequenceBuffer.length = 0; }

  public destroy(): void {
    this.isDestroyed = true;
    this.removeListeners();
    this.combos = [];
    this.sequences = [];
    this.activeKeys.clear();
    this.sequenceBuffer.length = 0;
  }

}

export default KeyboardTracker;
