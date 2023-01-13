export class GamePad {
  private inputs: Map<string, number> = new Map();
  private strokes: Map<string, number> = new Map();

  constructor(
    public aliases: Map<string, string> = new Map(),
    public debug = true,
  ) {
    document.addEventListener('keydown', register.bind(this));
    document.addEventListener('keyup', unregister.bind(this));
    document.addEventListener('keypress', onkey.bind(this));
    document.addEventListener('mousedown', register.bind(this));
    document.addEventListener('mouseup', unregister.bind(this));
    document.addEventListener('mouseclick', onkey.bind(this));
    document.addEventListener('contextmenu', (e) => e.preventDefault());
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

function register(ev: KeyboardEvent) {
  ev.preventDefault();
  const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
  this.set(key, 1);
}
function unregister(ev: KeyboardEvent) {
  ev.preventDefault();
  const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
  this.set(key, 0);
}
function onkey(ev: KeyboardEvent) {
  ev.preventDefault();
  const key = ev instanceof MouseEvent ? `Mouse${ev.button}` : ev.code;
  this.set(key, 1, true);
}
