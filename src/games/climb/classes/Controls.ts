import { ControlType } from '../../../utilities/types';
import { applyDeadzone } from '../../../utilities/math';
import { findStandardGamepad } from '../../../utilities/inputs/gamepadApi';
import { isEditableTarget } from '../../../utilities/dom';

/**
 * Climb controls: left, right and jump. Arrows/WASD and the left stick move,
 * Space / the primary button jumps. An AI brain writes the three channels;
 * the class has only those three enumerable fields on purpose — a brain's
 * output count is derived from `Object.keys(controls)`.
 */
export class Controls {
  /** move left, 0..1 from the keys or a brain output */
  public left: number = 0;
  /** move right, 0..1 from the keys or a brain output */
  public right: number = 0;
  /** the jump channel: 1 while held, by a brain output or a live press */
  public jump: number = 0;
  /** the bound handlers, kept so dispose() can remove them again — real
   *  privates so Object.keys(controls) counts only the drive outputs */
  #keydown: ((e: KeyboardEvent) => void) | undefined;
  #keyup: ((e: KeyboardEvent) => void) | undefined;
  #gamepadIndex: number | undefined;
  #gamepadEnabled = false;
  #keyboardLeft = 0;
  #keyboardRight = 0;
  #gamepadLeft = 0;
  #gamepadRight = 0;
  #spaceHeld = false;
  #primaryHeld = false;
  #brainJumpHeld = false;
  /** set once the player drives with the keyboard or gamepad; main.ts reads
   *  it to decide whether the camera stays on the human player */
  #playerActive = false;

  /** True once the player has given any driving input. The camera follows
   *  the best-scoring player until then, and the human player afterwards. */
  public get playerActive() {
    return this.#playerActive;
  }

  /** Whether the jump channel is currently held, whatever drives it. The HUD
   *  timeline samples this once per rendered frame. */
  public get jumpHeld() {
    return this.jump > 0.5 || this.#spaceHeld || this.#primaryHeld;
  }

  /** A brain writes its jump output here: held above 0.5 counts as pressed.
   *  Player.ts edge-detects it against the previous frame. */
  public writeJump(pressed: number) {
    this.#brainJumpHeld = pressed > 0.5;
    this.jump = this.#brainJumpHeld ? 1 : 0;
  }

  constructor(type: ControlType) {
    this.#gamepadEnabled = type === ControlType.HUMAN;
    if (type === ControlType.KEYS || type === ControlType.HUMAN)
      this.#addKeyboardListeners();
  }

  #syncOutputs() {
    this.left = Math.max(
      0,
      Math.min(1, this.#keyboardLeft + this.#gamepadLeft),
    );
    this.right = Math.max(
      0,
      Math.min(1, this.#keyboardRight + this.#gamepadRight),
    );
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
      this.#gamepadLeft = 0;
      this.#gamepadRight = 0;
      this.#primaryHeld = false;
      this.#syncOutputs();
      return;
    }

    // standard mapping: left stick is axes 0 (x) and 1 (y, positive down)
    const axis = applyDeadzone(pad.axes[0] || 0);
    const dpadLeft = pad.buttons[14]?.pressed ? 1 : 0;
    const dpadRight = pad.buttons[15]?.pressed ? 1 : 0;
    this.#gamepadLeft = Math.max(axis < 0 ? -axis : 0, dpadLeft);
    this.#gamepadRight = Math.max(axis > 0 ? axis : 0, dpadRight);

    const primary = pad.buttons[0]?.pressed ?? false;
    if (primary && !this.#primaryHeld) this.#playerActive = true;
    this.#primaryHeld = primary;
    if (this.#gamepadLeft !== 0 || this.#gamepadRight !== 0 || primary)
      this.#playerActive = true;
    this.#syncOutputs();
  }

  /** what a key sets: a signed contribution to one move axis, or undefined
   *  when unbound */
  #keyToAxis(key: string): 'left' | 'right' | undefined {
    switch (key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        return 'left';
      case 'ArrowRight':
      case 'd':
      case 'D':
        return 'right';
    }
  }

  /** Arrows/WASD move; Space jumps without repeating while held. */
  #addKeyboardListeners() {
    const down = (e: KeyboardEvent) => {
      // typing in a form field never drives the player
      if (isEditableTarget(e.target)) return;
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.#playerActive = true;
        this.#spaceHeld = true;
        return;
      }
      const axis = this.#keyToAxis(e.key);
      if (axis === undefined) return;
      e.preventDefault();
      this.#playerActive = true;
      if (axis === 'left') this.#keyboardLeft = 1;
      else this.#keyboardRight = 1;
      this.#syncOutputs();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        this.#spaceHeld = false;
        return;
      }
      const axis = this.#keyToAxis(e.key);
      if (axis === undefined) return;
      if (axis === 'left') this.#keyboardLeft = 0;
      else this.#keyboardRight = 0;
      this.#syncOutputs();
    };
    this.#keydown = down;
    this.#keyup = up;
    document.addEventListener('keydown', down);
    document.addEventListener('keyup', up);
  }

  public dispose() {
    if (this.#keydown) document.removeEventListener('keydown', this.#keydown);
    if (this.#keyup) document.removeEventListener('keyup', this.#keyup);
    this.#keydown = undefined;
    this.#keyup = undefined;
    this.#gamepadIndex = undefined;
    this.#spaceHeld = false;
    this.#primaryHeld = false;
    this.#brainJumpHeld = false;
    this.jump = 0;
    this.#gamepadLeft = 0;
    this.#gamepadRight = 0;
    this.#keyboardLeft = 0;
    this.#keyboardRight = 0;
    this.#syncOutputs();
  }
}
