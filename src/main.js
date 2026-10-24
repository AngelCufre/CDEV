import { Engine } from './core/Engine.js';
import { SceneManager } from './core/SceneManager.js';
import { Input } from './core/Input.js';
import { AudioManager } from './core/AudioManager.js';
import { PlayerStats } from './core/PlayerStats.js';
import { Overlay } from './ui/Overlay.js';
import { config } from './config.js';
import { createStressFeedback } from './systems/StressFeedback.js';
import { createBreathing } from './systems/Breathing.js';
import { createCameraEffects } from './systems/CameraEffects.js';
import { NO_REFLECTION_LAYER } from './world/wetReflection.js';
import { BedroomScene } from './scenes/bedroom/BedroomScene.js';
import { BusStopScene } from './scenes/busStop/BusStopScene.js';
import { BusRideScene } from './scenes/busRide/BusRideScene.js';
import { FacultyScene } from './scenes/faculty/FacultyScene.js';
import { ExamScene } from './scenes/exam/ExamScene.js';
import { isDebugMode, createDebugTools } from './utils/debug.js';

const canvas = document.getElementById('app-canvas');
const overlayRoot = document.getElementById('overlay-root');
const params = new URLSearchParams(window.location.search);

// ?calidad=baja dibuja sin post-procesado ni reflejos (para máquinas con poca GPU).
if (params.get('calidad') === 'baja') {
  config.render.postProceso = false;
  config.render.reflejos = false;
}

const engine = new Engine(canvas);
const overlay = new Overlay(overlayRoot);
const audio = new AudioManager(engine.camera);
const input = new Input(engine.camera, canvas);
const stats = new PlayerStats();
// La cámara del jugador ve la lluvia; la de los reflejos del piso mojado, no.
engine.camera.layers.enable(NO_REFLECTION_LAYER);
let debugTools = null;
const sceneManager = new SceneManager({
  engine,
  input,
  audio,
  overlay,
  stats,
  onSceneLoaded: () => debugTools?.refreshStates(),
});
sceneManager.register('habitacion', BedroomScene);
sceneManager.register('parada', BusStopScene);
sceneManager.register('colectivo', BusRideScene);
sceneManager.register('facultad', FacultyScene);
sceneManager.register('parcial', ExamScene);

// ?escena=parada (o colectivo, facultad o parcial) arranca directo en esa escena, para probar sin
// rehacer las anteriores.
const requestedScene = params.get('escena');
const firstScene = sceneManager.has(requestedScene) ? requestedScene : 'habitacion';

// También se puede respirar leyendo (el parcial borroso se aclara al bajar el estrés).
const breathing = createBreathing({
  input,
  stats,
  canBreathe: () => input.isLookEnabled || overlay.isNotesOpen,
});
const feedback = createStressFeedback({ stats, overlay, audio, post: engine.post });
const cameraEffects = createCameraEffects({ camera: engine.camera, input, stats });

// "Volver a jugar" (pantalla final): recarga desde la primera escena, conservando ?debug.
overlay.onRestart(() => {
  const next = new URLSearchParams(window.location.search);
  next.delete('escena');
  const query = next.toString();
  window.location.href = `${window.location.pathname}${query ? `?${query}` : ''}`;
});

if (isDebugMode()) {
  debugTools = createDebugTools({
    renderer: engine.renderer,
    getStateMachine: () => sceneManager.currentScene?.narrative?.machine ?? null,
    sceneNames: ['habitacion', 'parada', 'colectivo', 'facultad', 'parcial'],
    goTo: (name) => sceneManager.goTo(name),
    playerStats: stats,
  });
  // Solo en modo debug: acceso rápido desde la consola del navegador para inspección manual.
  window.__debugApp = { sceneManager, engine, stats };
}

function frame(delta) {
  debugTools?.beginFrame();
  sceneManager.update(delta);
  breathing.update(delta);
  feedback.update(delta, { breathing: breathing.active, silent: overlay.isSummaryVisible });
  const scene = sceneManager.currentScene;
  if (scene) {
    // El balanceo y el temblor existen solo mientras se dibuja este frame.
    cameraEffects.apply(delta);
    // Lo que se dibuja antes que la escena con la cámara final (los reflejos del piso).
    scene.beforeRender?.();
    engine.render(scene.scene, delta);
    cameraEffects.restore();
  }
  debugTools?.endFrame();
}

overlay.showStartScreen(async () => {
  overlay.hideStartScreen();
  // Gestos requeridos por el navegador: desbloquear audio y pedir pointer lock
  // dentro del mismo click de "Comenzar".
  await audio.unlock();
  input.lock();
  // La habitación lo esconde mientras el personaje sigue dormido.
  overlay.setStatsVisible(true);

  await sceneManager.goTo(firstScene);
  engine.start(frame);
});
