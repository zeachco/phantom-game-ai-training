export class GamePad {
  private inputs: Map<string, number> = new Map();
  private strokes: Map<string, number> = new Map();

  constructor(
    public aliases: Map<string, string> = new Map(),
    public debug = true,
    private container: HTMLElement | Document = document,
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
    container.addEventListener('mousedown', this.register);
    container.addEventListener('mouseup', this.unregister);
    container.addEventListener('mouseclick', this.onkey);
    container.addEventListener('contextmenu', this.cancel);
    container.addEventListener('mousemove', this.handleMouveMovement);
    container.addEventListener('wheel', this.handleMouveMovement);
  }

  public remove() {
    this.container.addEventListener('keydown', this.register);
    this.container.addEventListener('keyup', this.unregister);
    this.container.addEventListener('keypress', this.onkey);
    this.container.addEventListener('mousedown', this.register);
    this.container.addEventListener('mouseup', this.unregister);
    this.container.addEventListener('mouseclick', this.onkey);
    this.container.addEventListener('contextmenu', this.cancel);
    this.container.addEventListener('mousemove', this.handleMouveMovement);
    this.container.addEventListener('wheel', this.handleMouveMovement);
  }

  public get(code: string): number {
    const key = this.aliases.get(code) || code;
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
    const val = this.inputs.get(key);
    if (val) this.inputs.delete(key);
    return Boolean(val);
  }

  private register(ev: KeyboardEvent | MouseEvent) {
    ev.preventDefault();
    const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
    this.set(key, 1);
  }
  private unregister(ev: KeyboardEvent | MouseEvent) {
    ev.preventDefault();
    const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
    this.set(key, 0);
  }
  private onkey(ev: KeyboardEvent | MouseEvent) {
    ev.preventDefault();
    const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
    this.set(key, 1, true);
  }
  private handleMouveMovement(ev: MouseEvent | WheelEvent) {
    if (ev instanceof WheelEvent) {
      this.set('MouseOZ', this.get('MouseZ'));
      this.set('MouseZ', (ev as any).wheelDelta);
    } else {
      this.set('MouseOX', this.get('MouseX'));
      this.set('MouseOY', this.get('MouseY'));
      this.set('MouseX', ev.x);
      this.set('MouseY', ev.y);
    }
  }
  private cancel(ev: MouseEvent) {
    ev.preventDefault();
  }
}
