import * as THREE from 'three';
import { config } from '../../config.js';
import { Collision } from '../../systems/Collision.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildSky, buildRain } from '../../world/weather.js';
import { WetReflection } from '../../world/wetReflection.js';
import { street } from './layout.js';
import { buildStreetScene } from './buildStreetScene.js';
import { createPuddles } from './puddles.js';
import { createTraffic } from './traffic.js';
import { createBusStopNarrative } from './narrative.js';

// El cielo y la lluvia acompañan al jugador: con cámara far = 50 m, un cielo fijo
// quedaría recortado al caminar hacia las puntas de la cuadra.
const SKY_RADIUS = 44;

/**
 * Escena 2: la parada del colectivo (sin techo) bajo la lluvia. El jugador puede
 * caminar por la vereda, pisar charcos, ver pasar autos y mirar el celular con R
 * mientras espera; cuando llega el colectivo, sube con E y pasa a la escena 3.
 */
export class BusStopScene {
  constructor({ engine, input, audio, overlay, stats, goTo }) {
    this.engine = engine;
    this.goTo = goTo;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    // Afuera no hay interior que proteger de la niebla: empieza más cerca que en la
    // habitación y termina antes del far de la cámara.
    this.scene.fog = new THREE.Fog(config.exterior.nieblaColor, 12, 45);
  }

  init() {
    const camera = this.engine.camera;

    // Piso mojado: la calzada y la vereda reflejan, cada una en su plano.
    this.reflections = {
      street: new WetReflection({ y: street.surfaceY }),
      sidewalk: new WetReflection({ y: 0 }),
    };
    const world = buildStreetScene(this.reflections);
    this.scene.add(world.group);

    this.sky = buildSky(SKY_RADIUS);
    this.scene.add(this.sky);

    this.rain = buildRain({
      count: 3500,
      area: { minX: -14, maxX: 14, minY: -0.15, maxY: 10, minZ: -12, maxZ: 12 },
    });
    this.scene.add(this.rain.mesh);

    this.puddles = createPuddles({
      audio: this.audio,
      camera,
      reflection: this.reflections.sidewalk,
    });
    this.scene.add(this.puddles.group);

    this.traffic = createTraffic({ audio: this.audio });
    this.scene.add(this.traffic.group);

    this.collision = new Collision(config.player.radioColision);
    for (const box of world.obstacles) this.collision.addObstacle(box);

    this.interaction = new Interaction(camera);
    this.interaction.register(
      this.traffic.bus.doorMesh,
      'Subir al colectivo',
      () => this.narrative.board(),
      () => this.traffic.bus.isStopped,
    );

    this.narrative = createBusStopNarrative({
      camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      stats: this.stats,
      interaction: this.interaction,
      collision: this.collision,
      puddles: this.puddles,
      traffic: this.traffic,
      onBoarded: () => this.goTo('colectivo'),
    });

    this._unsubscribers.push(
      this.input.onInteract(() => this.narrative.interact()),
      this.input.onKeyDown((code) => {
        if (code === 'KeyR') this.narrative.togglePhone();
      }),
    );

    this.audio.playRain({ exterior: true });
  }

  update(delta) {
    const cameraPosition = this.engine.camera.position;
    this.sky.position.set(cameraPosition.x, 0, cameraPosition.z);
    this.rain.update(delta, cameraPosition);
    this.traffic.update(delta);
    this.narrative.update(delta);
  }

  /** Reflejos del piso mojado, con la cámara ya lista para el frame. */
  beforeRender() {
    for (const reflection of Object.values(this.reflections)) {
      reflection.update(this.engine.renderer, this.scene, this.engine.camera);
    }
  }

  dispose() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
    for (const reflection of Object.values(this.reflections ?? {})) reflection.dispose();
    this.traffic?.stopSounds();
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
