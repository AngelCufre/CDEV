import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * Abstrae el input de teclado/mouse. Expone un estado de movimiento plano
 * ({forward, back, left, right}) y un evento de "interactuar" (E o click),
 * sin conocer nada de gameplay ni de la escena.
 */
export class Input {
  constructor(camera, domElement) {
    this.controls = new PointerLockControls(camera, domElement);
    this.domElement = domElement;

    this.move = { forward: false, back: false, left: false, right: false };

    this._interactListeners = [];
    this._lockChangeListeners = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onClick = this._onClick.bind(this);

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
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

  onInteract(callback) {
    this._interactListeners.push(callback);
  }

  onLockChange(callback) {
    this._lockChangeListeners.push(callback);
  }

  _emitLockChange(locked) {
    for (const cb of this._lockChangeListeners) cb(locked);
  }

  _emitInteract() {
    for (const cb of this._interactListeners) cb();
  }

  _onKeyDown(event) {
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

  _onClick() {
    // Si el puntero ya está bloqueado, un click se interpreta como interacción.
    if (this.controls.isLocked) this._emitInteract();
  }

  dispose() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    this.domElement.removeEventListener('click', this._onClick);
    this.controls.dispose();
  }
}
