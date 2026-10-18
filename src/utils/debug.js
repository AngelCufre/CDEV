import Stats from 'stats.js';
import GUI from 'lil-gui';

/**
 * Modo debug, activado con ?debug en la URL:
 * - stats.js (FPS)
 * - lil-gui con métricas de renderer.info, botones para saltar de estado narrativo y
 *   los stats del jugador para ajustarlos a mano
 */
export function isDebugMode() {
  return new URLSearchParams(window.location.search).has('debug');
}

export function createDebugTools({
  renderer,
  getStateMachine,
  sceneNames = [],
  goTo,
  playerStats,
}) {
  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'fixed';
  stats.dom.style.top = '0';
  stats.dom.style.left = '0';
  stats.dom.style.zIndex = '20';
  document.body.appendChild(stats.dom);

  const gui = new GUI();
  // Abajo a la derecha: arriba a la derecha está el HUD de stats.
  Object.assign(gui.domElement.style, { top: 'auto', bottom: '0' });
  const infoFolder = gui.addFolder('renderer.info');
  const infoState = { drawCalls: 0, triangulos: 0, geometrias: 0, texturas: 0 };
  infoFolder.add(infoState, 'drawCalls').listen();
  infoFolder.add(infoState, 'triangulos').listen();
  infoFolder.add(infoState, 'geometrias').listen();
  infoFolder.add(infoState, 'texturas').listen();

  if (playerStats) {
    const statsFolder = gui.addFolder('Stats del jugador');
    for (const key of Object.keys(playerStats.values)) {
      statsFolder.add(playerStats.values, key, 0, 100, 1).listen();
    }
  }

  const sceneFolder = gui.addFolder('Escena');
  const sceneActions = {};
  for (const name of sceneNames) {
    sceneActions[name] = () => goTo(name);
    sceneFolder.add(sceneActions, name);
  }

  // Los botones de estado se rearman con los estados de la escena activa.
  let narrativeFolder = null;
  function refreshStates() {
    narrativeFolder?.destroy();
    narrativeFolder = gui.addFolder('Narrativa (saltar estado)');
    const sm = getStateMachine();
    if (!sm) return;
    const narrativeActions = {};
    for (const estado of Object.keys(sm.states)) {
      narrativeActions[estado] = () => getStateMachine()?.transition(estado);
      narrativeFolder.add(narrativeActions, estado);
    }
  }

  function updateInfoPanel() {
    infoState.drawCalls = renderer.info.render.calls;
    infoState.triangulos = renderer.info.render.triangles;
    infoState.geometrias = renderer.info.memory.geometries;
    infoState.texturas = renderer.info.memory.textures;
  }

  return {
    stats,
    gui,
    refreshStates,
    beginFrame() {
      stats.begin();
    },
    endFrame() {
      stats.end();
      updateInfoPanel();
    },
    dispose() {
      gui.destroy();
      stats.dom.remove();
    },
  };
}
