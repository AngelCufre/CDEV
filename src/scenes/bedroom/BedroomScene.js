import * as THREE from 'three';
import { config } from '../../config.js';
import { createBedroomMaterials } from './materials.js';
import { buildRoom } from './buildRoom.js';
import { buildLights } from './lights.js';
import { GeometryBuckets } from './GeometryBuckets.js';
import { buildBed } from './props/bed.js';
import { buildNightstand } from './props/nightstand.js';
import { buildDesk } from './props/desk.js';
import { buildChair } from './props/chair.js';
import { buildBookPile } from './props/clutter.js';
import { buildAlarmClock } from './props/alarmClock.js';
import { buildPhone } from './props/phone.js';
import { Collision } from '../../systems/Collision.js';
import { Interaction } from '../../systems/Interaction.js';
import { createNarrative } from './narrative.js';

/**
 * Escena de la habitación: el estudiante se despierta, se levanta y descubre
 * que llega tarde al parcial. Implementa la interfaz común init/update/dispose
 * que espera SceneManager.
 */
export class BedroomScene {
  constructor({ engine, input, audio, overlay }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.scene = new THREE.Scene();
    // Se ve a través de la ventana: cielo de mañana brillante, para reforzar
    // que el sol ya está alto (y por lo tanto que es tarde).
    this.scene.background = new THREE.Color(0xffe0ad);
  }

  init() {
    const materials = createBedroomMaterials();
    const obstacles = [];
    const buckets = new GeometryBuckets();

    const { group: roomGroup, obstacles: roomObstacles } = buildRoom(materials);
    this.scene.add(roomGroup);
    obstacles.push(...roomObstacles);

    buildBed(buckets, obstacles);
    const { topY: nightstandTopY } = buildNightstand(buckets, obstacles);
    buildDesk(buckets, obstacles);
    buildChair(buckets, obstacles);

    const furnitureMeshes = buckets.buildMeshes(materials, {
      castShadow: false,
      receiveShadow: true,
    });
    for (const mesh of furnitureMeshes) this.scene.add(mesh);

    const bookPile = buildBookPile(1.35, 0.35);
    this.scene.add(bookPile.mesh);

    const clock = buildAlarmClock(nightstandTopY);
    this.scene.add(clock.group);

    const phone = buildPhone(nightstandTopY);
    this.scene.add(phone.group);

    const { group: lightsGroup } = buildLights();
    this.scene.add(lightsGroup);

    this.collision = new Collision(config.player.radioColision);
    for (const box of obstacles) this.collision.addObstacle(box);

    this.interaction = new Interaction(this.engine.camera);
    this.interaction.register(clock.interactableMesh, 'Mirar el despertador', () =>
      this.narrative.requestRealization(),
    );
    this.interaction.register(phone.interactableMesh, 'Mirar el celular', () =>
      this.narrative.requestRealization(),
    );

    this.narrative = createNarrative({
      camera: this.engine.camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      interaction: this.interaction,
      collision: this.collision,
    });

    this._onInteractPress = () => {
      if (this.narrative.machine.currentName === 'EXPLORING') {
        this.interaction.triggerInteract();
      }
    };
    this.input.onInteract(this._onInteractPress);

    // La geometría estática ya está armada: alcanza con un único recalculo del shadow map.
    this.engine.requestShadowUpdate();
  }

  update(delta) {
    this.narrative.update(delta);
  }

  dispose() {
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
