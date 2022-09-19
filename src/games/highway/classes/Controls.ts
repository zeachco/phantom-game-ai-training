import { ControlType } from '../types';

export class Controls {
  public forward: number = 0;
  public left: number = 0;
  public right: number = 0;
  public reverse: number = 0;
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
    document.onkeydown = (event) => {
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
    document.onkeyup = (event) => {
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
  }
}
