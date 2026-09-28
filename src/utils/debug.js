import Stats from 'stats.js';
import GUI from 'lil-gui';

/**
 * Modo debug, activado con ?debug en la URL:
 * - stats.js (FPS)
 * - lil-gui con métricas de renderer.info y botones para saltar de estado narrativo
 */
export function isDebugMode() {
  return new URLSearchParams(window.location.search).has('debug');
}

export function createDebugTools({ renderer, getStateMachine }) {
  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.style.position = 'fixed';
  stats.dom.style.top = '0';
  stats.dom.style.left = '0';
  stats.dom.style.zIndex = '20';
  document.body.appendChild(stats.dom);

  const gui = new GUI();
  const infoFolder = gui.addFolder('renderer.info');
  const infoState = { drawCalls: 0, triangulos: 0, geometrias: 0, texturas: 0 };
  infoFolder.add(infoState, 'drawCalls').listen();
  infoFolder.add(infoState, 'triangulos').listen();
  infoFolder.add(infoState, 'geometrias').listen();
  infoFolder.add(infoState, 'texturas').listen();

  const narrativeFolder = gui.addFolder('Narrativa (saltar estado)');
  const estados = ['SLEEPING', 'WAKING', 'GETTING_UP', 'EXPLORING', 'REALIZATION'];
  const narrativeActions = {};
  for (const estado of estados) {
    narrativeActions[estado] = () => {
      const sm = getStateMachine();
      if (sm) sm.transition(estado);
    };
    narrativeFolder.add(narrativeActions, estado);
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
