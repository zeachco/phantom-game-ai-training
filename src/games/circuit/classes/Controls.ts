import { ControlType } from '../types';

const GAMEPAD_DEADZONE = 0.12;

function applyDeadzone(value: number) {
  const magnitude = Math.abs(value);
  if (magnitude <= GAMEPAD_DEADZONE) return 0;
  return (
    (Math.sign(value) * (magnitude - GAMEPAD_DEADZONE)) / (1 - GAMEPAD_DEADZONE)
  );
}

export class Controls {
  /** signed throttle: > 0 gas, < 0 brake / reverse, 0 neutral — floats welcome */
  public throttle: number = 0;
  public left: number = 0;
  public right: number = 0;
  /** the bound handlers, kept so dispose() can remove them again — real
   *  privates so Object.keys(controls) counts only the drive outputs */
  #keydown: ((e: KeyboardEvent) => void) | undefined;
  #keyup: ((e: KeyboardEvent) => void) | undefined;
  #gamepadIndex: number | undefined;
  #gamepadEnabled = false;
  #keyboardLeft = 0;
  #keyboardRight = 0;
  #gamepadThrottle = 0;
  #gamepadLeft = 0;
  #gamepadRight = 0;

  constructor(type: ControlType) {
    this.#gamepadEnabled = type === ControlType.HUMAN;
    switch (type) {
      case ControlType.KEYS:
      case ControlType.HUMAN:
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
        this.throttle = 1;
        break;
    }
  }

  /** held throttle directions: releasing one key must not clear the other */
  #gasHeld = false;
  #reverseHeld = false;

  #syncOutputs() {
    const gas = Math.max(
      this.#gasHeld ? 1 : 0,
      this.#gamepadThrottle > 0 ? this.#gamepadThrottle : 0,
    );
    const reverse = Math.max(
      this.#reverseHeld ? 1 : 0,
      this.#gamepadThrottle < 0 ? -this.#gamepadThrottle : 0,
    );
    this.throttle = gas > 0 ? gas : reverse > 0 ? -reverse : 0;
    this.left = Math.max(this.#keyboardLeft, this.#gamepadLeft);
    this.right = Math.max(this.#keyboardRight, this.#gamepadRight);
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

  #buttonValue(pad: Gamepad, index: number) {
    const button = pad.buttons[index];
    if (!button) return 0;
    return Math.max(0, Math.min(1, button.value || (button.pressed ? 1 : 0)));
  }

  /** Polling is intentional: Gamepad API values are stateful and must be read
   *  during the simulation frame rather than inferred from browser events. */
  public update() {
    if (!this.#gamepadEnabled) return;

    const pad = this.#findGamepad();
    if (!pad) {
      this.#gamepadIndex = undefined;
      this.#gamepadThrottle = 0;
      this.#gamepadLeft = 0;
      this.#gamepadRight = 0;
      this.#syncOutputs();
      return;
    }

    const axis = applyDeadzone(pad.axes[0] || 0);
    const dpadLeft = this.#buttonValue(pad, 14);
    const dpadRight = this.#buttonValue(pad, 15);
    this.#gamepadLeft = Math.max(axis < 0 ? -axis : 0, dpadLeft);
    this.#gamepadRight = Math.max(axis > 0 ? axis : 0, dpadRight);

    // Standard mapping: button 6 is L2 and button 7 is R2. R2 accelerates;
    // L2 brakes and then reverses, matching the keyboard's down/S behavior.
    const reverse = this.#buttonValue(pad, 6);
    const gas = this.#buttonValue(pad, 7);
    this.#gamepadThrottle = gas > 0 ? gas : reverse > 0 ? -reverse : 0;
    this.#syncOutputs();
  }

  /** what a key sets: throttle keys carry their sign, undefined when unbound */
  #keyToOutput(
    key: string,
  ): 'throttle+' | 'throttle-' | 'left' | 'right' | undefined {
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        return 'throttle+';
      case 'ArrowDown':
      case 's':
      case 'S':
        return 'throttle-';
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

  /** arrows or WASD drive the car, exactly those keys are captured */
  #addKeyboardListeners() {
    const down = (e: KeyboardEvent) => {
      // typing in a form field never drives the car
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t instanceof HTMLInputElement ||
          t instanceof HTMLTextAreaElement ||
          t instanceof HTMLSelectElement ||
          t.isContentEditable)
      )
        return;
      const map = this.#keyToOutput(e.key);
      if (map === undefined) return;
      e.preventDefault();
      if (map === 'throttle+') this.#gasHeld = true;
      else if (map === 'throttle-') this.#reverseHeld = true;
      else if (map === 'left') this.#keyboardLeft = 1;
      else if (map === 'right') this.#keyboardRight = 1;
      this.#syncOutputs();
    };
    const up = (e: KeyboardEvent) => {
      const map = this.#keyToOutput(e.key);
      if (map === undefined) return;
      if (map === 'throttle+') this.#gasHeld = false;
      else if (map === 'throttle-') this.#reverseHeld = false;
      else if (map === 'left') this.#keyboardLeft = 0;
      else if (map === 'right') this.#keyboardRight = 0;
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
    this.#gamepadThrottle = 0;
    this.#gamepadLeft = 0;
    this.#gamepadRight = 0;
    this.#syncOutputs();
  }
}
