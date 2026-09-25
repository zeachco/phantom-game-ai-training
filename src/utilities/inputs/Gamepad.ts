export class GamePad {
  private inputs: Map<string, number> = new Map();
  private strokes: Map<string, number> = new Map();
  /** the codes the game actually reads, only those are captured */
  private bound = new Set<string>();

  constructor(
    public aliases: Map<string, string> = new Map(),
    public debug = false,
    private container: HTMLElement | Document = document,
    private useMouse = false,
  ) {
    this.register = this.register.bind(this);
    this.unregister = this.unregister.bind(this);
    this.onkey = this.onkey.bind(this);
    this.handleMouveMovement = this.handleMouveMovement.bind(this);
    this.cancel = this.cancel.bind(this);

    this.inputs.set('MouseX', 0);
    this.inputs.set('MouseY', 0);
    this.inputs.set('MouseZ', 0);

    container.addEventListener('keydown', this.register);
    container.addEventListener('keyup', this.unregister);
    container.addEventListener('keypress', this.onkey);
    if (this.useMouse) {
      container.addEventListener('mousedown', this.register);
      container.addEventListener('mouseup', this.unregister);
      container.addEventListener('mouseclick', this.onkey);
      container.addEventListener('contextmenu', this.cancel);
      container.addEventListener('mousemove', this.handleMouveMovement);
      container.addEventListener('wheel', this.handleMouveMovement);
    }
  }

  public remove() {
    this.container.removeEventListener('keydown', this.register);
    this.container.removeEventListener('keyup', this.unregister);
    this.container.removeEventListener('keypress', this.onkey);
    if (this.useMouse) {
      this.container.removeEventListener('mousedown', this.register);
      this.container.removeEventListener('mouseup', this.unregister);
      this.container.removeEventListener('mouseclick', this.onkey);
      this.container.removeEventListener('contextmenu', this.cancel);
      this.container.removeEventListener('mousemove', this.handleMouveMovement);
      this.container.removeEventListener('wheel', this.handleMouveMovement);
    }
  }

  public get(code: string): number {
    const key = this.aliases.get(code) || code;
    this.bound.add(key);
    return this.inputs.get(key) || 0;
  }

  public set(code: string, value: number, once = false): void {
    const key = this.aliases.get(code) || code;
    if (once) this.strokes.set(key, value);
    if (this.debug) console.log(key, value);
    this.inputs.set(key, value);
  }

  public once(code: string) {
    const key = this.aliases.get(code) || code;
    this.bound.add(key);
    const val = this.inputs.get(key);
    if (val) this.inputs.delete(key);
    return Boolean(val);
  }

  /** the browser keeps its own keys: modifier combos, the function keys,
   *  and anything typed into a form field */
  private isBrowserKey(ev: KeyboardEvent): boolean {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return true;
    if (/^F\d{1,2}$/.test(ev.code)) return true;
    const target = ev.target as HTMLElement | null;
    return (
      !!target &&
      (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target.isContentEditable)
    );
  }

  private register(ev: KeyboardEvent | MouseEvent) {
    if (ev instanceof KeyboardEvent) {
      if (this.isBrowserKey(ev)) return;
      const key = ev.code;
      // only the keys the game reads are captured, the rest pass through
      if (this.bound.has(key)) ev.preventDefault();
      this.set(key, 1);
    } else {
      this.set(`Mouse${ev.button}`, 1);
    }
  }
  private unregister(ev: KeyboardEvent | MouseEvent) {
    // always cleared, even for browser keys, so nothing ever gets stuck
    const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
    this.set(key, 0);
  }
  private onkey(ev: KeyboardEvent | MouseEvent) {
    if (ev instanceof KeyboardEvent) {
      if (this.isBrowserKey(ev)) return;
      const key = ev.code;
      if (this.bound.has(key)) ev.preventDefault();
      this.set(key, 1, true);
    } else {
      this.set(`Mouse${ev.button}`, 1, true);
    }
  }
  private handleMouveMovement(ev: MouseEvent | WheelEvent) {
    if (ev instanceof WheelEvent) {
      this.set('MouseOZ', this.get('MouseZ'));
      this.set(
        'MouseZ',
        (ev as WheelEvent & { wheelDelta?: number }).wheelDelta,
      );
    } else {
      this.set('MouseOX', this.get('MouseX'));
      this.set('MouseOY', this.get('MouseY'));
      this.set('MouseX', ev.offsetX);
      this.set('MouseY', ev.offsetY);
    }
  }
  private cancel(ev: MouseEvent) {
    ev.preventDefault();
  }
}
