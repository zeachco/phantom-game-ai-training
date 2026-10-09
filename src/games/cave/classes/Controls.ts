import { ControlType } from '../types';

const GAMEPAD_DEADZONE = 0.12;

function applyDeadzone(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude <= GAMEPAD_DEADZONE) return 0;
  return (
    (Math.sign(value) * (magnitude - GAMEPAD_DEADZONE)) / (1 - GAMEPAD_DEADZONE)
  );
}

/**
 * Monkey Ball controls: two analog axes, exactly like a GameCube stick.
 * `moveY` is forward/back along the track, `moveX` is left/right across it,
 * both in [-1, 1]. WASD / arrows drive the keyboard, the left stick drives
 * the gamepad. Space / the primary button jumps; an AI brain writes the
 * two axes directly. The class has
 * only those two enumerable fields on purpose: a brain's output count is
 * derived from `Object.keys(controls)`.
 */
export class Controls {
  /** signed lateral axis: > 0 right, < 0 left, 0 centered */
  public moveX: number = 0;
  /** signed forward axis: > 0 forward (into the cave), < 0 backward */
  public moveY: number = 0;
  /** the bound handlers, kept so dispose() can remove them again — real
   *  privates so Object.keys(controls) counts only the stick axes */
  #keydown: ((e: KeyboardEvent) => void) | undefined;
  #keyup: ((e: KeyboardEvent) => void) | undefined;
  #gamepadIndex: number | undefined;
  #gamepadEnabled = false;
  #keyboardX = 0;
  #keyboardY = 0;
  #gamepadX = 0;
  #gamepadY = 0;
  #jumpRequested = false;
  #spaceHeld = false;
  #primaryHeld = false;

  public requestJump() {
    this.#jumpRequested = true;
  }

  /** Consume an edge once, including presses rejected while airborne. */
  public consumeJump() {
    const requested = this.#jumpRequested;
    this.#jumpRequested = false;
    return requested;
  }

  constructor(type: ControlType) {
    this.#gamepadEnabled = type === ControlType.HUMAN;
    switch (type) {
      case ControlType.KEYS:
      case ControlType.HUMAN:
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
        this.moveY = 1;
        break;
    }
  }

  #syncOutputs() {
    this.moveX = Math.max(-1, Math.min(1, this.#keyboardX + this.#gamepadX));
    this.moveY = Math.max(-1, Math.min(1, this.#keyboardY + this.#gamepadY));
  }

  /** Read the browser's standard gamepad mapping. DualShock controllers are
   * exposed as "Wireless Controller" in most browsers. The standard mapping
   * keeps this working when the browser does not include that name in id. */
  #findGamepad(): Gamepad | undefined {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const pads = Array.from(navigator.getGamepads()).filter(
      (pad): pad is Gamepad => !!pad && pad.connected,
    );
    const current = pads.find((pad) => pad.index === this.#gamepadIndex);
    if (current) return current;

    const dualshock = pads.find((pad) =>
      /dualshock|playstation|wireless controller|sony/i.test(pad.id),
    );
    const standard = pads.find((pad) => pad.mapping === 'standard');
    const selected = dualshock || standard;
    this.#gamepadIndex = selected?.index;
    return selected;
  }

  /** Polling is intentional: Gamepad API values are stateful and must be read
   *  during the simulation frame rather than inferred from browser events. */
  public update() {
    if (!this.#gamepadEnabled) return;

    const pad = this.#findGamepad();
    if (!pad) {
      this.#gamepadIndex = undefined;
      this.#gamepadX = 0;
      this.#gamepadY = 0;
      this.#primaryHeld = false;
      this.#syncOutputs();
      return;
    }

    // standard mapping: left stick is axes 0 (x) and 1 (y, positive down)
    this.#gamepadX = applyDeadzone(pad.axes[0] || 0);
    this.#gamepadY = -applyDeadzone(pad.axes[1] || 0);
    const primary = pad.buttons[0]?.pressed ?? false;
    if (primary && !this.#primaryHeld) this.requestJump();
    this.#primaryHeld = primary;
    this.#syncOutputs();
  }

  /** what a key sets: a signed contribution to one stick axis, or undefined
   *  when unbound */
  #keyToAxis(key: string): 'x+' | 'x-' | 'y+' | 'y-' | undefined {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'y+';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'y-';
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'x-';
      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'x+';
    }
  }

  /** Arrows/WASD roll; Space jumps without repeating while held. */
  #addKeyboardListeners() {
    const recompute = () => {
      const up =
        (this.#held.has('y+') ? 1 : 0) - (this.#held.has('y-') ? 1 : 0);
      const right =
        (this.#held.has('x+') ? 1 : 0) - (this.#held.has('x-') ? 1 : 0);
      this.#keyboardX = right;
      this.#keyboardY = up;
      this.#syncOutputs();
    };
    const down = (e: KeyboardEvent) => {
      // typing in a form field never drives the ball
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement ||
          t.isContentEditable)
      )
        return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (!this.#spaceHeld && !e.repeat) this.requestJump();
        this.#spaceHeld = true;
        return;
      }
      const axis = this.#keyToAxis(e.key);
      if (axis === undefined) return;
      e.preventDefault();
      this.#held.add(axis);
      recompute();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        this.#spaceHeld = false;
        return;
      }
      const axis = this.#keyToAxis(e.key);
      if (axis === undefined) return;
      this.#held.delete(axis);
      recompute();
    };
    this.#keydown = down;
    this.#keyup = up;
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
  }

  /** held axis directions, keyed by sign, so opposite keys cancel */
  #held = new Set<'x+' | 'x-' | 'y+' | 'y-'>();

  public dispose() {
    if (this.#keydown) document.removeEventListener('keydown', this.#keydown);
    if (this.#keyup) document.removeEventListener('keyup', this.#keyup);
    this.#keydown = undefined;
    this.#keyup = undefined;
    this.#gamepadIndex = undefined;
    this.#held.clear();
    this.#jumpRequested = false;
    this.#spaceHeld = false;
    this.#primaryHeld = false;
    this.#gamepadX = 0;
    this.#gamepadY = 0;
    this.#keyboardX = 0;
    this.#keyboardY = 0;
    this.#syncOutputs();
  }
}
