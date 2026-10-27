import { ControlType } from '../../../utilities/types';
import { isEditableTarget } from '../../../utilities/dom';

export class Controls {
  public forward: number = 0;
  public left: number = 0;
  public right: number = 0;
  public reverse: number = 0;

  /** the bound handlers, kept so dispose() can remove them again — a
   *  re-init replaces the camera car, not just its body */
  #keydown?: (event: KeyboardEvent) => void;
  #keyup?: (event: KeyboardEvent) => void;

  constructor(type: ControlType) {
    switch (type) {
      case ControlType.KEYS:
        this.#addKeyboardListeners();
        break;
      case ControlType.DUMMY:
        this.forward = 1;
        break;
    }
  }

  #addKeyboardListeners() {
    this.#keydown = (event) => {
      // typing in a form field never drives the car
      if (isEditableTarget(event.target)) return;
      switch (event.key) {
        case 'ArrowLeft':
          this.left = 1;
          break;
        case 'ArrowRight':
          this.right = 1;
          break;
        case 'ArrowUp':
          this.forward = 1;
          break;
        case 'ArrowDown':
          this.reverse = 1;
          break;
      }
    };
    this.#keyup = (event) => {
      switch (event.key) {
        case 'ArrowLeft':
          this.left = 0;
          break;
        case 'ArrowRight':
          this.right = 0;
          break;
        case 'ArrowUp':
          this.forward = 0;
          break;
        case 'ArrowDown':
          this.reverse = 0;
          break;
      }
    };
    document.addEventListener('keydown', this.#keydown);
    document.addEventListener('keyup', this.#keyup);
  }

  public dispose() {
    if (this.#keydown) document.removeEventListener('keydown', this.#keydown);
    if (this.#keyup) document.removeEventListener('keyup', this.#keyup);
    this.#keydown = undefined;
    this.#keyup = undefined;
  }
}
