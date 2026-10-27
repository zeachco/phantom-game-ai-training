import { ControlType } from '../../../utilities/types';
import { applyDeadzone, clamp } from '../../../utilities/math';
import { findStandardGamepad } from '../../../utilities/inputs/gamepadApi';
import { isEditableTarget } from '../../../utilities/dom';

/**
 * Monkey Ball controls: two analog axes, exactly like a GameCube stick.
 * `moveY` is forward/back along the track, `moveX` is left/right across it,
 * both in [-1, 1]. WASD / arrows drive the keyboard, the left stick drives
 * the gamepad. Space / the primary button jumps; an AI brain writes the two
 * axes and the jump press. The class has only those three enumerable fields
 * on purpose: a brain's output count is derived from `Object.keys(controls)`.
 */
export class Controls {
  /** signed lateral axis: > 0 right, < 0 left, 0 centered */
  public moveX: number = 0;
  /** signed forward axis: > 0 forward (into the cave), < 0 backward */
  public moveY: number = 0;
  /** the AI jump channel, written by Ball from the brain's third output */
  public jump: number = 0;
  /** the bound handlers, kept so dispose() can remove them again — real
   *  privates so Object.keys(controls) counts only the control channels */
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
  #brainJumpHeld = false;
  /** set once the player drives with the keyboard or gamepad; main.ts reads
   *  it to decide whether the camera stays on the human ball */
  #playerActive = false;

  /** True once the player has given any driving input. The camera follows the
   *  best-scoring ball until then, and the human ball afterwards. */
  public get playerActive() {
    return this.#playerActive;
  }

  /** Whether the jump channel is currently held, whatever drives it: a brain's
   *  third output or a live Space / primary-button press. The HUD timeline
   *  samples this once per rendered frame. */
  public get jumpHeld() {
    return this.jump > 0 || this.#spaceHeld || this.#primaryHeld;
  }

  public requestJump() {
    this.#jumpRequested = true;
  }

  /** Consume an edge once, including presses rejected while airborne. */
  public consumeJump() {
    const requested = this.#jumpRequested;
    this.#jumpRequested = false;
    return requested;
  }

  /** A brain writes its jump output here: a rising edge requests one jump,
   *  exactly like a fresh press. */
  public writeJump(pressed: number) {
    const held = pressed > 0.5;
    if (held && !this.#brainJumpHeld) this.requestJump();
    this.#brainJumpHeld = held;
    this.jump = held ? 1 : 0;
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
    this.moveX = clamp(this.#keyboardX + this.#gamepadX, -1, 1);
    this.moveY = clamp(this.#keyboardY + this.#gamepadY, -1, 1);
  }

  /** Read the browser's standard gamepad mapping. DualShock controllers are
   * exposed as "Wireless Controller" in most browsers. The standard mapping
   * keeps this working when the browser does not include that name in id. */
  #findGamepad(): Gamepad | undefined {
    const found = findStandardGamepad(this.#gamepadIndex);
    if (!found) {
      this.#gamepadIndex = undefined;
      return;
    }
    this.#gamepadIndex = found.index;
    return found.pad;
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
    if (this.#gamepadX !== 0 || this.#gamepadY !== 0 || primary)
      this.#playerActive = true;
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
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.#playerActive = true;
        if (!this.#spaceHeld && !e.repeat) this.requestJump();
        this.#spaceHeld = true;
        return;
      }
      const axis = this.#keyToAxis(e.key);
      if (axis === undefined) return;
      e.preventDefault();
      this.#playerActive = true;
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
    this.#brainJumpHeld = false;
    this.jump = 0;
    this.#gamepadX = 0;
    this.#gamepadY = 0;
    this.#keyboardX = 0;
    this.#keyboardY = 0;
    this.#syncOutputs();
  }
}
