/**
 * Máquina de estados genérica y desacoplada del render.
 * Los estados son objetos con hooks opcionales: { onEnter(ctx), onUpdate(delta, ctx), onExit(ctx) }.
 * Se usa desde cualquier escena para modelar su narrativa sin ensuciar el loop principal.
 */
export class StateMachine {
  constructor(states, initialState, context = {}) {
    this.states = states;
    this.context = context;
    this.current = null;
    this._transitionTo(initialState);
  }

  get currentName() {
    return this._currentName;
  }

  transition(name) {
    if (name === this._currentName) return;
    if (this.current?.onExit) this.current.onExit(this.context);
    this._transitionTo(name);
  }

  update(delta) {
    if (this.current?.onUpdate) this.current.onUpdate(delta, this.context);
  }

  _transitionTo(name) {
    const state = this.states[name];
    if (!state) {
      throw new Error(`Estado desconocido en la máquina de estados: "${name}"`);
    }
    this._currentName = name;
    this.current = state;
    if (state.onEnter) state.onEnter(this.context);
  }
}
