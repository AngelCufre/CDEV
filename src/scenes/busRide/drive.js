import * as THREE from 'three';
import { config } from '../../config.js';
import { CAR_COLORS, createBeamResources, buildCar } from '../../world/vehicles.js';
import { road } from './layout.js';

const CAR_SPAWN_X = 95;
const CAR_DESPAWN_X = -95;

/**
 * El viaje: velocidad del colectivo (acelera, va crucero y frena justo en una parada)
 * y todo lo que depende de ella: la ciudad que se desplaza, la lluvia inclinada, el
 * ruido del motor y los autos que vienen de frente por el otro carril.
 */
export function createDrive({ strip, rains, audio, engineAnchor }) {
  const { velocidad, aceleracion, frenado } = config.viaje.colectivo;
  const group = new THREE.Group();
  group.name = 'oncoming-traffic';

  // Arranca desde la parada de la escena anterior: sale acelerando.
  let speed = 0;
  let previousSpeed = 0;
  let acceleration = 0;
  let stopTarget = null; // { remaining: () => number, onStopped }
  let stopped = false;

  const engine = audio.createVehicleSound('bus');
  engineAnchor.add(engine.audio);

  // ---------- Autos de frente ----------
  const beams = createBeamResources();
  const carMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const cars = [];
  let carTimer = 2;

  function spawnCar() {
    const object = buildCar(
      CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
      carMaterial,
      beams,
    );
    object.position.set(CAR_SPAWN_X, road.surfaceY, road.oppositeLaneZ);
    object.rotation.y = Math.PI; // vienen hacia -x
    const sound = audio.createVehicleSound('car');
    object.add(sound.audio);
    group.add(object);
    cars.push({ object, sound, speed: 10 + Math.random() * 4 });
  }

  function updateCars(delta) {
    carTimer -= delta;
    if (carTimer <= 0) {
      spawnCar();
      carTimer = 3 + Math.random() * 5;
    }
    for (let i = cars.length - 1; i >= 0; i -= 1) {
      const car = cars[i];
      // Velocidad relativa: la del auto más la del colectivo (la ciudad viene hacia atrás).
      car.object.position.x -= (car.speed + speed) * delta;
      if (car.object.position.x < CAR_DESPAWN_X) {
        car.sound.stop();
        group.remove(car.object);
        car.object.getObjectByName('car-body').geometry.dispose();
        cars.splice(i, 1);
      }
    }
  }

  function update(delta) {
    if (stopped) {
      speed = 0;
    } else if (stopTarget) {
      const remaining = stopTarget.remaining();
      // La velocidad que permite frenar justo al llegar (con desaceleración `frenado`).
      const brakingSpeed = Math.sqrt(2 * frenado * Math.max(remaining, 0));
      speed = Math.min(speed + aceleracion * delta, velocidad, brakingSpeed);
      if (remaining <= 0.05) {
        speed = 0;
        stopped = true;
        const { onStopped } = stopTarget;
        stopTarget = null;
        audio.playBrakeHiss();
        onStopped();
      }
    } else {
      speed = Math.min(velocidad, speed + aceleracion * delta);
    }

    acceleration = delta > 0 ? (speed - previousSpeed) / delta : 0;
    previousSpeed = speed;

    strip.scroll(speed * delta);
    for (const rain of rains) rain.setWind(config.exterior.lluvia.viento - speed);
    engine.setRolling(speed / velocidad);
    updateCars(delta);
  }

  return {
    group,
    update,
    get speed() {
      return speed;
    },
    /** m/s²: negativo al frenar. */
    get acceleration() {
      return acceleration;
    },
    get isStopped() {
      return stopped;
    },
    /** Distancia mínima para poder frenar desde la velocidad actual (con un margen). */
    get brakingDistance() {
      return (speed * speed) / (2 * frenado) + 3;
    },
    /** Frena cuando `remaining()` (distancia a la parada) llegue a 0. */
    stopAt(remaining, onStopped) {
      stopTarget = { remaining, onStopped };
    },
    resume() {
      stopped = false;
    },
    dispose() {
      engine.stop();
      for (const car of cars) car.sound.stop();
    },
  };
}
