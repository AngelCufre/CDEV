import * as THREE from 'three';
import { mergeParts } from '../../world/lowPoly.js';
import { addSeatedPerson, addStandingPerson } from '../../world/people.js';

// Ángulos (rad) entre la mirada del jugador y la dirección al cartel.
const LOOK_CONE = 0.3; // "lo está mirando"
const AWAY_CONE = 0.75; // "ya miró para otro lado"
const NOTICE_FIRST = 0.7; // s mirándolo hasta que el pasajero se da cuenta
const NOTICE_AGAIN = 0.3; // las veces siguientes reacciona más rápido
const AWAY_TIME = 0.9; // s mirando para otro lado hasta que se anima a sacarlo de nuevo
const HIDE_TIME = 0.18;
const SHOW_TIME = 0.35;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const smooth = (t) => t * t * (3 - 2 * t);

function buildSignTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#efe3c2';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#b9a77a';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);
  ctx.fillStyle = '#c42a22';
  ctx.font = 'bold 120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2', 64, 70);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Pasajero del último asiento que le muestra al jugador un cartel con un "2". Cuando
 * el jugador lo mira, lo esconde y se hace el distraído; cuando deja de mirarlo, lo
 * vuelve a sacar.
 */
export function createSignHolder({
  camera,
  style,
  x,
  z,
  baseYaw = 0,
  standing = false,
  signScale = 1,
  lookAwayYaw = 0.9, // cuánto gira el cuerpo para hacerse el distraído
}) {
  const group = new THREE.Group();
  group.name = 'passenger-sign-holder';
  group.position.set(x, 0, z);

  const bodyParts = [];
  if (standing) addStandingPerson(bodyParts, { x: 0, z: 0, style });
  else addSeatedPerson(bodyParts, { x: 0, z: 0, style });
  group.add(mergeParts(bodyParts, 'sign-holder-body'));
  // Alturas (hombros, cartel afuera, cartel escondido) según esté sentado o parado.
  const shoulderY = standing ? 1.38 : 1.1;
  const upY = standing ? 1.45 : 1.2;
  const hiddenY = standing ? 0.95 : 0.72;

  // El cartel (cara con el 2 hacia +x) con las manos que lo sostienen.
  const cardboard = new THREE.MeshBasicMaterial({ color: 0xcdb98a });
  const face = new THREE.MeshBasicMaterial({ map: buildSignTexture() });
  const sign = new THREE.Group();
  sign.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.42, 0.42), [
      face,
      cardboard,
      cardboard,
      cardboard,
      cardboard,
      cardboard,
    ]),
  );
  const skin = new THREE.MeshBasicMaterial({ color: style.skin });
  const sleeve = new THREE.MeshBasicMaterial({ color: style.jacket });
  const hands = [-1, 1].map((side) => {
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), skin);
    hand.position.set(0.02, -0.17, side * 0.17);
    sign.add(hand);
    return hand;
  });
  sign.scale.setScalar(signScale);
  group.add(sign);

  // Antebrazos: del hombro a cada mano, siempre estirados entre los dos puntos.
  const shoulders = [-1, 1].map((side) => new THREE.Vector3(-0.05, shoulderY, side * 0.21));
  const arms = shoulders.map(() => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 1), sleeve);
    group.add(arm);
    return arm;
  });

  const _p = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _look = new THREE.Vector3();

  // 0 = cartel afuera, 1 = escondido contra el pecho.
  let hidden = 0;
  let target = 0;
  let mode = 'showing'; // showing | noticing | hiding-wait | away
  let timer = 0;
  let seen = 0;

  function pose() {
    const k = smooth(hidden);
    sign.position.set(lerp(0.3, 0.1, k), lerp(upY, hiddenY, k), 0);
    sign.rotation.set(0, lerp(0, Math.PI, k), lerp(0, 0.5, k));
    group.rotation.y = baseYaw + lookAwayYaw * smooth(clamp01((hidden - 0.4) / 0.6));
    group.updateMatrixWorld(true);
    for (let i = 0; i < 2; i++) {
      hands[i].getWorldPosition(_p);
      group.worldToLocal(_p);
      const arm = arms[i];
      const from = shoulders[i];
      arm.position.copy(from).add(_p).multiplyScalar(0.5);
      arm.scale.z = from.distanceTo(_p);
      arm.lookAt(group.localToWorld(_p.clone()));
    }
  }
  pose();

  /** Ángulo entre hacia dónde mira el jugador y dónde está el cartel. */
  function lookAngle() {
    sign.getWorldPosition(_p);
    _dir.copy(_p).sub(camera.position).normalize();
    camera.getWorldDirection(_look);
    return Math.acos(THREE.MathUtils.clamp(_look.dot(_dir), -1, 1));
  }

  function update(delta) {
    const angle = lookAngle();
    if (mode === 'showing') {
      if (angle < LOOK_CONE) {
        timer += delta;
        if (timer >= (seen === 0 ? NOTICE_FIRST : NOTICE_AGAIN)) {
          mode = 'away';
          target = 1;
          timer = 0;
          seen += 1;
        }
      } else {
        timer = 0;
      }
    } else if (mode === 'away') {
      // Escondido y haciéndose el distraído hasta que el jugador mire a otro lado.
      if (angle > AWAY_CONE) {
        timer += delta;
        if (timer >= AWAY_TIME) {
          mode = 'showing';
          target = 0;
          timer = 0;
        }
      } else {
        timer = 0;
      }
    }
    const speed = target > hidden ? 1 / HIDE_TIME : 1 / SHOW_TIME;
    hidden =
      target > hidden
        ? Math.min(target, hidden + delta * speed)
        : Math.max(target, hidden - delta * speed);
    pose();
  }

  /** Vuelve al estado inicial (cartel afuera), para reutilizar el mismo pasajero. */
  function reset() {
    hidden = 0;
    target = 0;
    mode = 'showing';
    timer = 0;
    seen = 0;
    pose();
  }

  return { group, update, reset };
}
