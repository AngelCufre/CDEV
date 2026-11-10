import * as THREE from 'three';
import { config } from '../../config.js';
import { Collision } from '../../systems/Collision.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildSky, buildRain } from '../../world/weather.js';
import { WetReflection } from '../../world/wetReflection.js';
import { buildBusInterior } from './buildInterior.js';
import { createPassengers } from './passengers.js';
import { createCityStrip } from './cityStrip.js';
import { createDrive } from './drive.js';
import { createBusRideNarrative } from './narrative.js';
import { bus, road } from './layout.js';

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * Escena 3: arriba del colectivo lleno, bajo la lluvia. El jugador va parado entre la
 * gente (puede moverse despacio por el pasillo), mira el celular con R, ve la ciudad
 * pasar por las ventanillas y tiene que tocar el timbre y bajarse en la facultad.
 */
export class BusRideScene {
  constructor({ engine, input, audio, overlay, stats, goTo }) {
    this.engine = engine;
    this.goTo = goTo;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];
    this._time = 0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    this.scene.fog = new THREE.Fog(config.exterior.nieblaColor, 10, 45);
  }

  init() {
    const camera = this.engine.camera;

    this.interior = buildBusInterior();
    this.scene.add(this.interior.group);

    this.passengers = createPassengers();
    this.scene.add(this.passengers.group);

    // La calle mojada refleja la ciudad que pasa (se ve por las ventanillas).
    // El interior y los pasajeros nunca se ven en ese reflejo.
    this.reflection = new WetReflection({
      y: road.surfaceY,
      hide: [this.interior.group, this.passengers.group],
    });
    this.strip = createCityStrip({ reflection: this.reflection });
    this.scene.add(this.strip.group);
    this.scene.add(buildSky(42));

    // Lluvia solo afuera: a los costados del colectivo y delante del parabrisas.
    const outside = bus.halfWidth + 0.25;
    const top = 9;
    this.rains = [
      buildRain({
        count: 1600,
        area: { minX: -22, maxX: 22, minY: road.surfaceY, maxY: top, minZ: outside, maxZ: 14 },
      }),
      buildRain({
        count: 1600,
        area: { minX: -22, maxX: 22, minY: road.surfaceY, maxY: top, minZ: -14, maxZ: -outside },
      }),
      buildRain({
        count: 500,
        area: {
          minX: bus.halfLength + 0.3,
          maxX: 30,
          minY: road.surfaceY,
          maxY: top,
          minZ: -outside,
          maxZ: outside,
        },
      }),
    ];
    for (const rain of this.rains) this.scene.add(rain.mesh);
    this._rainCenter = new THREE.Vector3();

    // El motor está atrás: ahí va su sonido posicional.
    const engineAnchor = new THREE.Object3D();
    engineAnchor.position.set(-bus.halfLength + 0.5, 0.6, 0);
    this.scene.add(engineAnchor);
    this.drive = createDrive({
      strip: this.strip,
      rains: this.rains,
      audio: this.audio,
      engineAnchor,
    });
    this.scene.add(this.drive.group);

    this.collision = new Collision(config.viaje.radioColision);
    for (const box of [...this.interior.obstacles, ...this.passengers.obstacles]) {
      this.collision.addObstacle(box);
    }

    this.interaction = new Interaction(camera);
    this.interaction.register(
      this.interior.bellHitbox,
      'Tocar el timbre',
      () => this.narrative.ringBell(),
      () => this.narrative.canRingBell(),
    );
    this.interaction.register(
      this.interior.backDoorHitbox,
      'Bajar del colectivo',
      () => this.narrative.getOff(),
      () => this.narrative.canGetOff(),
    );

    this.narrative = createBusRideNarrative({
      camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      stats: this.stats,
      interaction: this.interaction,
      collision: this.collision,
      interior: this.interior,
      passengers: this.passengers,
      drive: this.drive,
      strip: this.strip,
      onGotOff: () => this.goTo('facultad'),
    });

    this._unsubscribers.push(
      this.input.onInteract(() => this.narrative.interact()),
      this.input.onKeyDown((code) => {
        if (code === 'KeyR') this.narrative.togglePhone();
      }),
    );

    this.audio.playRain();
  }

  /**
   * Balanceo del colectivo: un rolido suave que crece con la velocidad, un leve
   * cabeceo al frenar o acelerar y el traqueteo del piso. Se aplica sobre la rotación
   * que maneja el mouse (yaw/pitch quedan intactos).
   */
  _applySway(delta) {
    this._time += delta;
    const camera = this.engine.camera;
    const t = this._time;
    const k = this.drive.speed / config.viaje.colectivo.velocidad;
    const lurch = THREE.MathUtils.clamp(-this.drive.acceleration / 6, -0.6, 0.6);
    _euler.setFromQuaternion(camera.quaternion, 'YXZ');
    _euler.z = (Math.sin(t * 1.1) * 0.012 + Math.sin(t * 2.9) * 0.004) * k + lurch * 0.015;
    camera.quaternion.setFromEuler(_euler);
    camera.position.y = config.player.alturaOjos + Math.sin(t * 7) * 0.008 * k;
  }

  update(delta) {
    this.drive.update(delta);
    for (const rain of this.rains) rain.update(delta, this._rainCenter);
    this.passengers.update(delta);
    this.narrative.update(delta);
    this._applySway(delta);
  }

  /** Reflejo de la calle mojada, con la cámara ya lista para el frame. */
  beforeRender() {
    this.reflection.update(this.engine.renderer, this.scene, this.engine.camera);
  }

  dispose() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
    this.reflection?.dispose();
    this.drive?.dispose();
    this.audio.stopAll();
    this.interaction?.unregisterAll();
    this.scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        const materialList = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materialList) {
          if (material.map) material.map.dispose();
          material.dispose();
        }
      }
    });
  }
}
