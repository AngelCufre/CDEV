import * as THREE from 'three';
import { config } from '../../config.js';
import { createBusDestinationTexture, createBusCrowdTexture } from '../../utils/textures.js';
import { paint, box, facadePlane, mergeParts } from '../../world/lowPoly.js';
import { street, busStop } from './layout.js';

/**
 * Tránsito de la calle: autos que pasan cada tanto por ambos carriles y el colectivo.
 * El colectivo puede venir lleno (amaga a frenar y sigue de largo) o con lugar (frena
 * en la parada y abre la puerta); el mismo objeto se reutiliza en cada pasada.
 *
 * Todos los vehículos miran a +x en coordenadas locales; los que van hacia -x se giran
 * 180°. Cada uno lleva su sonido posicional y conos de luz (aditivos) delante de los faros,
 * que con la lluvia y la niebla dan la sensación de día oscuro.
 */

const SPAWN_X = 75;
const DESPAWN_X = 80;
// Distancia mínima al auto anterior del mismo carril para que no aparezcan encimados.
const MIN_GAP = 25;
const CAR_COLORS = [0x8e1b1b, 0x1f3f66, 0xb9b9b4, 0x2b2b2e, 0x3f5e3a, 0xc2a14a, 0x6b6f75];

// Posición local de la puerta del colectivo (lado derecho, delante del eje delantero).
const BUS_DOOR_X = 4.9;
const BUS_HALF_WIDTH = 1.25;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** Conos de luz de los faros: geometría y material compartidos por todos los vehículos. */
function createBeamResources() {
  const geometry = new THREE.ConeGeometry(1.1, 7, 16, 1, true);
  // Rotado para que el vértice quede atrás (en el faro) y la base hacia +x.
  geometry.rotateZ(Math.PI / 2);
  geometry.translate(3.5, 0, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xfff1c9,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  return { geometry, material };
}

function addBeams(object, beams, x, y, zs) {
  for (const z of zs) {
    const beam = new THREE.Mesh(beams.geometry, beams.material);
    beam.position.set(x, y, z);
    beam.renderOrder = 1;
    object.add(beam);
  }
}

function addWheels(parts, radius, width, xs, halfTrack) {
  for (const x of xs) {
    for (const side of [1, -1]) {
      const wheel = new THREE.CylinderGeometry(radius, radius, width, 12);
      wheel.rotateX(Math.PI / 2);
      wheel.translate(x, radius, side * halfTrack);
      parts.push(paint(wheel, 0x17191c));
    }
  }
}

function buildCar(color, bodyMaterial, beams) {
  const parts = [];
  parts.push(paint(box(4.2, 0.62, 1.78, 0, 0.55, 0), color));
  parts.push(paint(box(2.3, 0.56, 1.6, -0.25, 1.14, 0), 0x2b333b)); // cabina (vidrios)
  parts.push(paint(box(2.1, 0.06, 1.62, -0.3, 1.43, 0), color)); // techo
  addWheels(parts, 0.32, 0.24, [1.35, -1.35], 0.82);
  for (const z of [0.58, -0.58]) {
    parts.push(paint(box(0.04, 0.13, 0.32, 2.11, 0.64, z), 0xfff4d6, { shaded: false }));
    parts.push(paint(box(0.04, 0.12, 0.3, -2.11, 0.66, z * 1.03), 0xd8261e, { shaded: false }));
  }

  const car = new THREE.Group();
  car.name = 'car';
  car.add(mergeParts(parts, 'car-body', bodyMaterial));
  addBeams(car, beams, 2.13, 0.64, [0.58, -0.58]);
  return car;
}

function buildBus(beams) {
  const parts = [];
  const length = 11.6;
  const halfLength = length / 2;
  parts.push(paint(box(length, 1.2, 2.5, 0, 0.95, 0), 0xe7e5df)); // franja baja blanca
  parts.push(paint(box(length, 1.55, 2.5, 0, 2.325, 0), 0x1f6fb2)); // franja alta
  parts.push(paint(box(length - 0.2, 0.12, 2.4, 0, 3.16, 0), 0xd8d6d0)); // techo

  // Ventanillas a ambos lados (del lado de la puerta terminan antes de ella).
  parts.push(paint(facadePlane(9.3, 1.05, -0.55, 2.3, BUS_HALF_WIDTH + 0.001, 1), 0x1c2530));
  parts.push(paint(facadePlane(10.8, 1.05, 0.1, 2.3, -BUS_HALF_WIDTH - 0.001, -1), 0x1c2530));

  const windshield = new THREE.PlaneGeometry(2.3, 1.5);
  windshield.rotateY(Math.PI / 2);
  windshield.translate(halfLength + 0.001, 2.05, 0);
  parts.push(paint(windshield, 0x222c36));
  const rearWindow = new THREE.PlaneGeometry(2.1, 0.9);
  rearWindow.rotateY(-Math.PI / 2);
  rearWindow.translate(-halfLength - 0.001, 2.3, 0);
  parts.push(paint(rearWindow, 0x222c36));

  parts.push(paint(box(0.12, 0.3, 2.5, halfLength + 0.02, 0.45, 0), 0x2b2b2b)); // paragolpes
  for (const z of [0.9, -0.9]) {
    parts.push(
      paint(box(0.04, 0.18, 0.35, halfLength + 0.03, 0.75, z), 0xfff4d6, { shaded: false }),
    );
  }
  for (const z of [1.05, -1.05]) {
    parts.push(paint(box(0.04, 0.3, 0.2, -halfLength - 0.03, 1.0, z), 0xd8261e, { shaded: false }));
  }
  addWheels(parts, 0.5, 0.3, [2.6, -3.6], 1.12);

  // Hueco de la puerta: interior iluminado, apenas por fuera de la carrocería. Queda
  // tapado por la hoja de la puerta (mesh aparte, más afuera) hasta que se abre.
  parts.push(
    paint(facadePlane(1.1, 2.45, BUS_DOOR_X, 1.5, BUS_HALF_WIDTH + 0.005, 1), 0xf0d9a6, {
      shaded: false,
    }),
  );
  parts.push(
    paint(facadePlane(1.1, 0.45, BUS_DOOR_X, 0.5, BUS_HALF_WIDTH + 0.006, 1), 0x8f8068, {
      shaded: false,
    }),
  ); // escalón
  parts.push(
    paint(box(0.04, 2.1, 0.01, BUS_DOOR_X - 0.32, 1.55, BUS_HALF_WIDTH + 0.008), 0x9a9a9a),
  ); // pasamanos

  const bus = new THREE.Group();
  bus.name = 'bus';
  bus.add(mergeParts(parts, 'bus-body'));

  const door = mergeParts(
    [paint(box(1.1, 2.45, 0.04, BUS_DOOR_X, 1.5, BUS_HALF_WIDTH + 0.03), 0x2d3a46)],
    'bus-door',
  );
  bus.add(door);

  const destination = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.34),
    new THREE.MeshBasicMaterial({
      map: createBusDestinationTexture(config.parada.linea, config.parada.destino),
    }),
  );
  destination.rotation.y = Math.PI / 2;
  destination.position.set(halfLength + 0.002, 2.95, 0);
  bus.add(destination);

  // Caja invisible para apuntarle a la puerta con la mira.
  const doorHitbox = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 2.6, 0.7),
    new THREE.MeshBasicMaterial(),
  );
  doorHitbox.position.set(BUS_DOOR_X, 1.4, BUS_HALF_WIDTH + 0.1);
  doorHitbox.visible = false;
  bus.add(doorHitbox);

  addBeams(bus, beams, halfLength + 0.05, 0.75, [0.9, -0.9]);
  return { object: bus, door, doorHitbox, crowd: buildBusCrowd(halfLength, bus) };
}

/**
 * Gente apretada en las ventanillas, la puerta y el parabrisas: se muestra solo cuando
 * el colectivo viene lleno. Son planos apenas por fuera de los vidrios.
 */
function buildBusCrowd(halfLength, bus) {
  const material = new THREE.MeshBasicMaterial({ map: createBusCrowdTexture() });
  const crowd = new THREE.Group();
  crowd.name = 'bus-crowd';

  // `uScale`/`uOffset` recortan un tramo de la textura para planos chicos, así no se
  // aplastan todas las siluetas en la puerta o el parabrisas.
  const addPanel = (width, height, uScale, uOffset, place) => {
    const geometry = new THREE.PlaneGeometry(width, height);
    const uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i += 1) uv.setX(i, uv.getX(i) * uScale + uOffset);
    const mesh = new THREE.Mesh(geometry, material);
    place(mesh);
    crowd.add(mesh);
  };

  addPanel(9.3, 1.05, 1, 0, (m) => m.position.set(-0.55, 2.3, BUS_HALF_WIDTH + 0.004));
  addPanel(10.8, 1.05, 1.15, 0.3, (m) => {
    m.rotation.y = Math.PI;
    m.position.set(0.1, 2.3, -BUS_HALF_WIDTH - 0.004);
  });
  // Contra el vidrio de la puerta (por delante de la hoja, que queda cerrada).
  addPanel(0.9, 1.3, 0.12, 0.45, (m) => m.position.set(BUS_DOOR_X, 1.95, BUS_HALF_WIDTH + 0.052));
  addPanel(2.1, 1.1, 0.25, 0.7, (m) => {
    m.rotation.y = Math.PI / 2;
    m.position.set(halfLength + 0.004, 2.1, 0);
  });

  crowd.visible = false;
  bus.add(crowd);
  return crowd;
}

export function createTraffic({ audio }) {
  const group = new THREE.Group();
  group.name = 'traffic';
  const beams = createBeamResources();
  const carMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const { autos, colectivo } = config.parada;

  // ---------- Autos ----------
  const cars = []; // { object, sound, direction, speed }
  let spawnTimer = randomBetween(1, 3);
  let eastboundBlocked = false;

  function lastCarInLane(direction) {
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      if (cars[i].direction === direction) return cars[i];
    }
    return null;
  }

  function trySpawnCar() {
    // Carril +z (hacia +x) queda libre cuando viene el colectivo, que usa ese carril.
    const direction = eastboundBlocked || Math.random() < 0.5 ? -1 : 1;
    const startX = -direction * SPAWN_X;
    const previous = lastCarInLane(direction);
    if (previous && Math.abs(previous.object.position.x - startX) < MIN_GAP) return false;

    let speed = randomBetween(autos.velocidadMin, autos.velocidadMax);
    // Nunca más rápido que el de adelante: así no se atraviesan.
    if (previous) speed = Math.min(speed, previous.speed);

    const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const object = buildCar(color, carMaterial, beams);
    object.position.set(startX, street.surfaceY, direction * street.laneZ);
    object.rotation.y = direction > 0 ? 0 : Math.PI;
    const sound = audio.createVehicleSound('car');
    object.add(sound.audio);
    group.add(object);
    cars.push({ object, sound, direction, speed });
    return true;
  }

  function removeCar(index) {
    const car = cars[index];
    car.sound.stop();
    group.remove(car.object);
    car.object.getObjectByName('car-body').geometry.dispose();
    cars.splice(index, 1);
  }

  function updateCars(delta) {
    spawnTimer -= delta;
    if (spawnTimer <= 0) {
      // Si no pudo aparecer (carril ocupado), reintenta en un rato corto.
      spawnTimer = trySpawnCar()
        ? randomBetween(autos.intervaloMinSegundos, autos.intervaloMaxSegundos)
        : 1;
    }
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const car = cars[i];
      car.object.position.x += car.direction * car.speed * delta;
      if (Math.abs(car.object.position.x) > DESPAWN_X) removeCar(i);
    }
  }

  // ---------- Colectivo ----------
  const bus = buildBus(beams);
  bus.object.visible = false;
  bus.object.position.set(-SPAWN_X, street.surfaceY, street.laneZ);
  group.add(bus.object);
  // Frena con la puerta apenas pasando el poste de la parada.
  const busTargetX = busStop.x + 0.9 - BUS_DOOR_X;
  // A esta distancia de la parada (m) se avisa que "viene el colectivo".
  const APPROACH_NOTICE = 30;
  let busState = 'hidden'; // 'hidden' | 'arriving' | 'stopped' | 'passing'
  let busSound = null;
  let onBusEvent = null;
  let busFull = false;
  let notified = { approaching: false, passed: false };

  /** `full`: viene lleno y no para. Si no, frena en la parada y abre la puerta. */
  function spawnBus({ full = false } = {}) {
    if (busState !== 'hidden') return;
    busState = full ? 'passing' : 'arriving';
    busFull = full;
    eastboundBlocked = true;
    notified = { approaching: false, passed: false };
    bus.object.position.x = -SPAWN_X;
    bus.object.visible = true;
    bus.crowd.visible = full;
    bus.door.visible = true;
    busSound = audio.createVehicleSound('bus');
    bus.object.add(busSound.audio);
  }

  function emit(event) {
    onBusEvent?.(event, { full: busFull });
  }

  function hideBus() {
    busSound.stop();
    busSound = null;
    bus.object.visible = false;
    busState = 'hidden';
    eastboundBlocked = false;
    emit('gone');
  }

  function updateBus(delta) {
    if (busState === 'hidden' || busState === 'stopped') return;
    const doorX = bus.object.position.x + BUS_DOOR_X;
    const cruise = colectivo.velocidad;

    if (!notified.approaching && doorX > busStop.x - APPROACH_NOTICE) {
      notified.approaching = true;
      emit('approaching');
    }

    if (busState === 'passing') {
      // Amaga a frenar cerca de la parada (como si el chofer dudara) y sigue.
      const distance = Math.abs(doorX - busStop.x);
      const minimum = colectivo.velocidadMinimaLleno;
      const speed = minimum + (cruise - minimum) * Math.min(1, distance / 20);
      busSound.setRolling(speed / cruise);
      bus.object.position.x += speed * delta;
      if (!notified.passed && doorX > busStop.x) {
        notified.passed = true;
        emit('passed');
      }
      if (bus.object.position.x > DESPAWN_X) hideBus();
      return;
    }

    const remaining = busTargetX - bus.object.position.x;
    const brakingDistance = (cruise * cruise) / (2 * colectivo.frenado);
    // Velocidad crucero y, al acercarse, la que permite frenar justo en la parada.
    const speed =
      remaining > brakingDistance ? cruise : Math.sqrt(2 * colectivo.frenado * remaining);
    busSound.setRolling(speed / cruise);

    if (remaining <= 0.03) {
      bus.object.position.x = busTargetX;
      busState = 'stopped';
      bus.door.visible = false; // se abre la puerta
      audio.playBrakeHiss();
      emit('arrived');
      return;
    }
    bus.object.position.x += Math.max(speed, 0.3) * delta;
  }

  return {
    group,
    bus: {
      doorMesh: bus.doorHitbox,
      get isStopped() {
        return busState === 'stopped';
      },
      get isActive() {
        return busState !== 'hidden';
      },
      /** Recibe ('approaching' | 'passed' | 'gone' | 'arrived', { full }). */
      onEvent(callback) {
        onBusEvent = callback;
      },
    },
    spawnBus,
    update(delta) {
      updateCars(delta);
      updateBus(delta);
    },
    /** Corta todos los sonidos de motor (al subir al colectivo o al descargar la escena). */
    stopSounds() {
      for (const car of cars) car.sound.stop();
      busSound?.stop();
    },
  };
}
