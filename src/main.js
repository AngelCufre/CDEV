import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { Input } from './core/Input.js';
import { AudioManager } from './core/AudioManager.js';
import { Overlay } from './ui/Overlay.js';
import { BedroomScene } from './scenes/bedroom/BedroomScene.js';
import { BusStopScene } from './scenes/busStop/BusStopScene.js';
import { isDebugMode, createDebugTools } from './utils/debug.js';

const canvas = document.getElementById('app-canvas');
const overlayRoot = document.getElementById('overlay-root');

const engine = new Engine(canvas);
const overlay = new Overlay(overlayRoot);
const audio = new AudioManager(engine.camera);
const input = new Input(engine.camera, canvas);
let debugTools = null;
const sceneManager = new SceneManager({
  engine,
  input,
  audio,
  overlay,
  onSceneLoaded: () => debugTools?.refreshStates(),
});
sceneManager.register('habitacion', BedroomScene);
sceneManager.register('parada', BusStopScene);

// ?escena=parada arranca directo en esa escena (útil para probar sin rehacer la anterior).
const requestedScene = new URLSearchParams(window.location.search).get('escena');
const firstScene = sceneManager.has(requestedScene) ? requestedScene : 'habitacion';

if (isDebugMode()) {
  debugTools = createDebugTools({
    renderer: engine.renderer,
    getStateMachine: () => sceneManager.currentScene?.narrative?.machine ?? null,
    sceneNames: ['habitacion', 'parada'],
    goTo: (name) => sceneManager.goTo(name),
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

  await sceneManager.goTo(firstScene);
  engine.start(frame);
});
