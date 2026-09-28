/**
 * Gestor de escenas. Cada escena implementa la interfaz común:
 *   init({ engine, input, audio }) -> Promise<void> | void
 *   update(delta) -> void
 *   dispose() -> void
 *
 * Preparado para registrar múltiples escenas (habitación, viaje, facultad, ...)
 * y transicionar entre ellas liberando los recursos GPU de la anterior.
 */
export class SceneManager {
  constructor({ engine, input, audio, overlay }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.currentScene = null;
  }

  async loadScene(SceneClass) {
    if (this.currentScene) {
      this.currentScene.dispose();
      this.currentScene = null;
    }

    const scene = new SceneClass({
      engine: this.engine,
      input: this.input,
      audio: this.audio,
      overlay: this.overlay,
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
