export class GamePad {
  private inputs: Map<string, number> = new Map();
  private strokes: Map<string, number> = new Map();

  constructor(
    public aliases: Map<string, string> = new Map(),
    public debug = false,
  ) {
    const register = (ev: KeyboardEvent) => this.set(ev.code, 1);
    const unregister = (ev: KeyboardEvent) => this.set(ev.code, 0);
    const onkey = (ev: KeyboardEvent) => this.set(ev.code, 1, true);
    document.addEventListener('keydown', register.bind(this));
    document.addEventListener('keyup', unregister.bind(this));
    document.addEventListener('keypress', onkey.bind(this));
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
}
