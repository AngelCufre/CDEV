import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { Input } from './core/Input.js';
import { AudioManager } from './core/AudioManager.js';
import { Overlay } from './ui/Overlay.js';
import { BedroomScene } from './scenes/bedroom/BedroomScene.js';
import { isDebugMode, createDebugTools } from './utils/debug.js';

const canvas = document.getElementById('app-canvas');
const overlayRoot = document.getElementById('overlay-root');

const engine = new Engine(canvas);
const overlay = new Overlay(overlayRoot);
const audio = new AudioManager(engine.camera);
const input = new Input(engine.camera, canvas);
const sceneManager = new SceneManager({ engine, input, audio, overlay });

let debugTools = null;
if (isDebugMode()) {
  debugTools = createDebugTools({
    renderer: engine.renderer,
    getStateMachine: () => sceneManager.currentScene?.narrative?.machine ?? null,
  });
  // Solo en modo debug: acceso rápido desde la consola del navegador para inspección manual.
  window.__debugApp = { sceneManager, engine };
}

function frame(delta) {
  debugTools?.beginFrame();
  sceneManager.update(delta);
  if (sceneManager.currentScene) {
    engine.renderer.render(sceneManager.currentScene.scene, engine.camera);
  }
  debugTools?.endFrame();
}

overlay.showStartScreen(async () => {
  overlay.hideStartScreen();
  // Gestos requeridos por el navegador: desbloquear audio y pedir pointer lock
  // dentro del mismo click de "Comenzar".
  await audio.unlock();
  input.lock();

  await sceneManager.loadScene(BedroomScene);
  engine.start(frame);
});
