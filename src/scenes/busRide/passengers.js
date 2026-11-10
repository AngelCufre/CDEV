import * as THREE from 'three';
import { mergeParts, seededRandom } from '../../world/lowPoly.js';
import { addStandingPerson, addSeatedPerson, randomPersonStyle } from '../../world/people.js';
import {
  bus,
  seatRowsX,
  leftSeatsZ,
  rightSeatZ,
  rightSeatRowsX,
  freedSeat,
  driverSeat,
  standingPassengers,
  rival,
} from './layout.js';

// Medio lado de la caja de colisión de un pasajero parado.
const PERSON_HALF = 0.2;
const WALK_SPEED = 1.0; // m/s, el que se baja caminando hacia la puerta

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (t) => Math.max(0, Math.min(1, t));

function personBox(x, z) {
  return new THREE.Box3(
    new THREE.Vector3(x - PERSON_HALF, 0, z - PERSON_HALF),
    new THREE.Vector3(x + PERSON_HALF, 2, z + PERSON_HALF),
  );
}

/** Un pasajero animable: dos meshes (parado y sentado) que se alternan según la pose. */
function buildAnimatedPerson(style, name) {
  const standingParts = [];
  addStandingPerson(standingParts, { x: 0, z: 0, style, armUp: false });
  const seatedParts = [];
  addSeatedPerson(seatedParts, { x: 0, z: 0, style });
  const standing = mergeParts(standingParts, `${name}-standing`);
  const seated = mergeParts(seatedParts, `${name}-seated`);
  const group = new THREE.Group();
  group.name = name;
  group.add(standing, seated);
  return {
    group,
    setSeated(isSeated) {
      seated.visible = isSeated;
      standing.visible = !isSeated;
    },
  };
}

/**
 * Pasajeros del colectivo lleno: todos los asientos ocupados, gente parada en el
 * pasillo y el chofer. Dos se animan: el que se baja en la parada intermedia (deja
 * el asiento libre) y el que se sienta antes que el jugador.
 */
export function createPassengers() {
  const random = seededRandom(23);
  const group = new THREE.Group();
  group.name = 'passengers';

  // ---------- Los que no se mueven (un solo mesh) ----------
  const parts = [];
  for (const x of seatRowsX) {
    for (const z of leftSeatsZ) addSeatedPerson(parts, { x, z, style: randomPersonStyle(random) });
  }
  for (const x of rightSeatRowsX) {
    if (x === freedSeat.x) continue; // ese lo ocupa el que se baja (animado)
    addSeatedPerson(parts, { x, z: rightSeatZ, style: randomPersonStyle(random) });
  }
  addSeatedPerson(parts, { x: driverSeat.x, z: driverSeat.z, style: randomPersonStyle(random) });
  const obstacles = [];
  for (const person of standingPassengers) {
    addStandingPerson(parts, { ...person, style: randomPersonStyle(random) });
    obstacles.push(personBox(person.x, person.z));
  }
  group.add(mergeParts(parts, 'passengers-static'));

  // ---------- El que se baja ----------
  const leaver = buildAnimatedPerson(randomPersonStyle(random), 'passenger-leaving');
  leaver.setSeated(true);
  leaver.group.position.set(freedSeat.x, 0, freedSeat.z);
  group.add(leaver.group);

  // ---------- El que te gana el asiento ----------
  const rivalPerson = buildAnimatedPerson(randomPersonStyle(random), 'passenger-rival');
  rivalPerson.setSeated(false);
  rivalPerson.group.position.set(rival.x, 0, rival.z);
  rivalPerson.group.rotation.y = rival.yaw;
  group.add(rivalPerson.group);
  // Su caja de colisión se mueve con él (Collision guarda la referencia).
  const rivalBox = personBox(rival.x, rival.z);
  obstacles.push(rivalBox);

  // ---------- Animaciones ----------
  let leaving = null; // { t, path, onDone }
  let sitting = null; // { t, from, onDone }

  const doorX = (bus.backDoor.minX + bus.backDoor.maxX) / 2;
  const aisleZ = 0.45;

  /** Se levanta, camina por el pasillo hasta la puerta de atrás y se baja. */
  function startLeaving(onDone) {
    const walk = Math.abs(doorX - freedSeat.x) / WALK_SPEED;
    leaving = { t: 0, walk, onDone };
  }

  function updateLeaving(delta) {
    if (!leaving) return;
    leaving.t += delta;
    const { t, walk } = leaving;
    const g = leaver.group;
    const standUp = 0.6;
    const exit = 0.7;
    if (t < standUp) {
      // Se para y sale al pasillo.
      leaver.setSeated(t < standUp / 2);
      g.position.z = lerp(freedSeat.z, aisleZ, clamp01(t / standUp));
    } else if (t < standUp + walk) {
      // Camina hacia la puerta (hacia +x).
      g.rotation.y = 0;
      g.position.x = lerp(freedSeat.x, doorX, (t - standUp) / walk);
    } else if (t < standUp + walk + exit) {
      // Gira hacia la puerta y baja.
      g.rotation.y = -Math.PI / 2;
      g.position.z = lerp(aisleZ, bus.halfWidth + 0.6, (t - standUp - walk) / exit);
    } else {
      g.visible = false;
      const done = leaving.onDone;
      leaving = null;
      done?.();
    }
  }

  /** Se mete en el asiento libre y se sienta. */
  function takeSeat(onDone) {
    sitting = {
      t: 0,
      fromX: rivalPerson.group.position.x,
      fromZ: rivalPerson.group.position.z,
      onDone,
    };
    // Deja de bloquear el pasillo: pasa a estar dentro de la franja de asientos.
    rivalBox.set(new THREE.Vector3(1000, 0, 1000), new THREE.Vector3(1000, 0, 1000));
  }

  function updateSitting(delta) {
    if (!sitting) return;
    sitting.t += delta;
    const g = rivalPerson.group;
    const move = 0.55;
    const sit = 0.35;
    const t = sitting.t;
    if (t < move) {
      const k = t / move;
      g.position.x = lerp(sitting.fromX, freedSeat.x, k);
      g.position.z = lerp(sitting.fromZ, freedSeat.z, k);
      g.rotation.y = lerp(rival.yaw, 0, k);
    } else if (t < move + sit) {
      g.position.set(freedSeat.x, 0, freedSeat.z);
      rivalPerson.setSeated(true);
    } else {
      const done = sitting.onDone;
      sitting = null;
      done?.();
    }
  }

  return {
    group,
    obstacles,
    startLeaving,
    takeSeat,
    update(delta) {
      updateLeaving(delta);
      updateSitting(delta);
    },
  };
}
