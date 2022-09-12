export class GamePad {
    aliases;
    inputs = new Map();
    strokes = new Map();
    constructor(aliases = new Map()) {
        this.aliases = aliases;
        const register = (ev) => this.set(ev.code, 1);
        const unregister = (ev) => this.set(ev.code, 0);
        const onkey = (ev) => this.set(ev.code, 1, true);
        document.addEventListener("keydown", register.bind(this));
        document.addEventListener("keyup", unregister.bind(this));
        document.addEventListener("keypress", onkey.bind(this));
    }
    get(code) {
        const key = this.aliases.get(code) || code;
        return this.inputs.get(key) || 0;
    }
    set(code, value, once = false) {
        const key = this.aliases.get(code) || code;
        if (once)
            this.strokes.set(key, value);
        this.inputs.set(key, value);
    }
    once(code) {
        const key = this.aliases.get(code) || code;
        const val = this.inputs.get(key);
        if (val) {
            this.inputs.delete(key);
        }
        return Boolean(val);
    }
}
