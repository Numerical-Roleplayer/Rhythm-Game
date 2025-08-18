let keyDownHandler = null;
let keyUpHandler = null;

export function initControls(onKeyDown, onKeyUp) {
  keyDownHandler = (e) => onKeyDown(e);
  keyUpHandler = (e) => onKeyUp(e);
  window.addEventListener('keydown', keyDownHandler);
  window.addEventListener('keyup', keyUpHandler);
}

export function removeControls() {
  if (keyDownHandler) {
    window.removeEventListener('keydown', keyDownHandler);
    keyDownHandler = null;
  }
  if (keyUpHandler) {
    window.removeEventListener('keyup', keyUpHandler);
    keyUpHandler = null;
  }
}
