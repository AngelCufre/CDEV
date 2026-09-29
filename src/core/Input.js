import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

function subscribe(list, callback) {
  list.push(callback);
  return () => {
    const index = list.indexOf(callback);
    if (index !== -1) list.splice(index, 1);
  };
}

/**
 * Abstrae el input de teclado/mouse. Expone un estado de movimiento plano
 * ({forward, back, left, right}) y un evento de "interactuar" (E o click),
 * sin conocer nada de gameplay ni de la escena.
 *
 * Cada `onX(callback)` devuelve una función para darse de baja: las escenas la
 * llaman en `dispose()` para no seguir recibiendo eventos después de descargarse.
 */
export class Input {
  constructor(camera, domElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.domElement = domElement;

    this.move = { forward: false, back: false, left: false, right: false };

    this._interactListeners = [];
    this._lockChangeListeners = [];
    this._keyListeners = [];
    this._wheelListeners = [];
    this._pointerMoveListeners = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onClick = this._onClick.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('wheel', this._onWheel, { passive: true });
    document.addEventListener('mousemove', this._onMouseMove);
    domElement.addEventListener('click', this._onClick);

    this.controls.addEventListener('lock', () => this._emitLockChange(true));
    this.controls.addEventListener('unlock', () => this._emitLockChange(false));
  }

  get isLocked() {
    return this.controls.isLocked;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }

  /**
   * Habilita/deshabilita mirar con el mouse sin soltar el pointer lock
   * (la narrativa lo bloquea mientras el personaje sigue acostado).
   */
  setLookEnabled(enabled) {
    this.controls.enabled = enabled;
  }

  onInteract(callback) {
    return subscribe(this._interactListeners, callback);
  }

  onLockChange(callback) {
    return subscribe(this._lockChangeListeners, callback);
  }

  /**
   * Recibe (`event.code`, `event.key`) de cada tecla presionada (sin auto-repetición).
   * `code` es la tecla física (WASD en cualquier distribución); `key` es el carácter,
   * útil para símbolos como + y − que cambian de lugar según el teclado.
   */
  onKeyDown(callback) {
    return subscribe(this._keyListeners, callback);
  }

  /** Recibe el `deltaY` de la rueda del mouse (negativo = hacia arriba). */
  onWheel(callback) {
    return subscribe(this._wheelListeners, callback);
  }

  /** Recibe el movimiento relativo del mouse (dx, dy), solo con el puntero bloqueado. */
  onPointerMove(callback) {
    return subscribe(this._pointerMoveListeners, callback);
  }

  _emitLockChange(locked) {
    for (const cb of this._lockChangeListeners) cb(locked);
  }

  _emitInteract() {
    for (const cb of this._interactListeners) cb();
  }

  _onKeyDown(event) {
    if (!event.repeat) {
      for (const cb of this._keyListeners) cb(event.code, event.key);
    }
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.move.forward = true;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.move.back = true;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.move.left = true;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.move.right = true;
        break;
      case 'KeyE':
        this._emitInteract();
        break;
      default:
        break;
    }
  }

  _onKeyUp(event) {
    switch (event.code) {
      case 'KeyW':
      case 'ArrowUp':
        this.move.forward = false;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.move.back = false;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.move.left = false;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.move.right = false;
        break;
      default:
        break;
    }
  }

  _onWheel(event) {
    for (const cb of this._wheelListeners) cb(event.deltaY);
  }

  _onMouseMove(event) {
    if (!this.controls.isLocked) return;
    for (const cb of this._pointerMoveListeners) cb(event.movementX, event.movementY);
  }

  _onClick() {
    // Si el puntero ya está bloqueado, un click se interpreta como interacción.
    // Si no (por ejemplo, se apretó Esc), el click lo vuelve a bloquear. Antes de
    // "Comenzar" y en el fundido final hay overlays que tapan el canvas, así que
    // en esos momentos el click nunca llega hasta acá.
    if (this.controls.isLocked) this._emitInteract();
    else this.lock();
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('mousemove', this._onMouseMove);
    this.domElement.removeEventListener('click', this._onClick);
    this.controls.dispose();
  }
}
