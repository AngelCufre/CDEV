/**
 * Gestor de escenas. Cada escena implementa la interfaz común:
 *   init() -> Promise<void> | void
 *   update(delta) -> void
 *   dispose() -> void
 *
 * Las escenas se registran con un nombre y cualquiera puede pedir pasar a otra con
 * `goTo(nombre)` (se le pasa como dependencia), sin importar la clase de la siguiente.
 * Al cambiar se liberan los recursos GPU de la anterior.
 */
export class SceneManager {
  constructor({ engine, input, audio, overlay, onSceneLoaded = null }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.onSceneLoaded = onSceneLoaded;
    this.currentScene = null;
    this.currentName = null;
    this._registry = new Map();
    this._loading = false;
  }

  register(name, SceneClass) {
    this._registry.set(name, SceneClass);
  }

  has(name) {
    return this._registry.has(name);
  }

  async goTo(name) {
    const SceneClass = this._registry.get(name);
    if (!SceneClass) throw new Error(`Escena no registrada: "${name}"`);
    // Evita cargas superpuestas si se pide cambiar de escena dos veces seguidas.
    if (this._loading) return this.currentScene;
    this._loading = true;
    try {
      // Normalmente se llama desde el update de la escena actual: se espera a que
      // termine el frame en curso antes de descargarla.
      await Promise.resolve();
      const scene = await this.loadScene(SceneClass);
      this.currentName = name;
      this.onSceneLoaded?.(name, scene);
      return scene;
    } finally {
      this._loading = false;
    }
  }

  async loadScene(SceneClass) {
    if (this.currentScene) {
      this.currentScene.dispose();
      this.currentScene = null;
    }
    // Limpia la UI de la escena anterior (hints, notificaciones, celular...). El
    // fundido a negro se mantiene: la escena nueva decide cuándo sacarlo.
    this.overlay.resetForSceneChange();

    const scene = new SceneClass({
      engine: this.engine,
      input: this.input,
      audio: this.audio,
      overlay: this.overlay,
      goTo: (name) => this.goTo(name),
    });

    await scene.init();
    this.currentScene = scene;
    return scene;
  }

  update(delta) {
    if (this.currentScene) this.currentScene.update(delta);
  }

  dispose() {
    if (this.currentScene) {
      this.currentScene.dispose();
      this.currentScene = null;
    }
  }
}
