import * as THREE from 'three';
import { randomPersonStyle } from '../../world/people.js';
import { seededRandom } from '../../world/lowPoly.js';
import { createSignHolder } from './signHolder.js';
import { road } from './layout.js';

const STARE_TIME = 4; // s mirando el mismo lugar de la ventanilla
const STARE_CONE = 0.3; // rad (~17°) de tolerancia para "el mismo lugar"
const MIN_SIDE_LOOK = 0.25; // |forward.z| mínimo para considerar que mira por una ventanilla
const COOLDOWN = 8; // s desde que se va hasta que puede aparecer otro
const MAX_LIFE = 25; // s máximos en pantalla (por si el colectivo está parado)
const GONE_X = -26;
const SPAWN_LEAD = 9; // m por delante de donde miraba: lo ves venir hacia tu mirada

const SIDES = {
  right: { z: road.rightCurbZ + road.sidewalkWidth / 2, yaw: Math.PI / 2, away: 0.9 },
  left: { z: road.leftCurbZ - road.sidewalkWidth / 2, yaw: -Math.PI / 2, away: -0.9 },
};

/**
 * Si el jugador se queda mirando el mismo punto de una ventanilla más de unos segundos,
 * aparece en la vereda de ese lado un pasajero con el mismo cartel con el "2": lo
 * esconde cuando lo mirás y lo vuelve a sacar cuando mirás para otro lado. Se mueve con
 * la ciudad (hacia -x, a la velocidad del colectivo).
 */
export function createSidewalkWatcher({ camera }) {
  const group = new THREE.Group();
  group.name = 'sidewalk-watcher';
  const random = seededRandom(77);

  const walkers = {};
  for (const [name, side] of Object.entries(SIDES)) {
    const walker = createSignHolder({
      camera,
      style: randomPersonStyle(random),
      x: 0,
      z: side.z,
      baseYaw: side.yaw,
      standing: true,
      signScale: 1.5,
      lookAwayYaw: side.away,
    });
    walker.group.visible = false;
    group.add(walker.group);
    walkers[name] = walker;
  }

  const forward = new THREE.Vector3();
  const anchor = new THREE.Vector3();
  let anchorSide = null;
  let stare = 0;
  let active = null; // { walker, life }
  let cooldown = COOLDOWN / 2;

  function spawn(sideName) {
    const side = SIDES[sideName];
    const t = (side.z - camera.position.z) / forward.z;
    const hitX = camera.position.x + forward.x * t;
    const walker = walkers[sideName];
    walker.reset();
    walker.group.position.set(
      THREE.MathUtils.clamp(hitX + SPAWN_LEAD, -18, 18),
      road.sidewalkY,
      side.z,
    );
    walker.group.visible = true;
    active = { walker, life: 0 };
  }

  function update(delta, speed) {
    cooldown = Math.max(0, cooldown - delta);

    if (active) {
      const { walker } = active;
      active.life += delta;
      walker.group.position.x -= speed * delta;
      walker.update(delta);
      if (walker.group.position.x < GONE_X || active.life > MAX_LIFE) {
        walker.group.visible = false;
        active = null;
        cooldown = COOLDOWN;
      }
      stare = 0;
      return;
    }

    camera.getWorldDirection(forward);
    const sideName = Math.abs(forward.z) < MIN_SIDE_LOOK ? null : forward.z > 0 ? 'right' : 'left';
    if (!sideName || cooldown > 0) {
      stare = 0;
      anchorSide = null;
      return;
    }
    if (sideName !== anchorSide || forward.angleTo(anchor) > STARE_CONE) {
      anchor.copy(forward);
      anchorSide = sideName;
      stare = 0;
      return;
    }
    stare += delta;
    if (stare >= STARE_TIME) {
      stare = 0;
      anchorSide = null;
      spawn(sideName);
    }
  }

  return { group, update };
}
