import * as THREE from 'three';
import { config } from '../../config.js';
import { createBedroomMaterials } from '../bedroom/materials.js';
import { buildRoom } from '../bedroom/buildRoom.js';
import { GeometryBuckets } from '../bedroom/GeometryBuckets.js';
import { buildBed } from '../bedroom/props/bed.js';
import { buildNightstand } from '../bedroom/props/nightstand.js';
import { buildDesk } from '../bedroom/props/desk.js';
import { buildChair } from '../bedroom/props/chair.js';
import { buildFloorClutter } from '../bedroom/props/clutter.js';
import { buildRug, buildPoster } from '../bedroom/props/decor.js';
import { Collision } from '../../systems/Collision.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildClosedCurtains } from './closedCurtains.js';
import { buildDiploma } from './diploma.js';
import { buildLightBeam } from './lightBeam.js';
import { createDespertarNarrative } from './narrative.js';

/**
 * Escena 6 y última: el despertar. Es la habitación del principio, pero con las cortinas
 * cerradas y en penumbra: el parcial fue una pesadilla. Un haz de sol entra por la rendija
 * de las cortinas y ilumina la pared donde cuelga el título de Licenciado en Sistemas.
 */
export class DespertarScene {
  constructor({ engine, input, audio, overlay, stats }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];

    this.scene = new THREE.Scene();
    // Lo único que se ve de afuera es el resplandor por la rendija: un día de sol.
    this.scene.background = new THREE.Color(0xfff1d2);
  }

  init() {
    const materials = createBedroomMaterials();
    // Ya no llueve: el vidrio es solo un resplandor liso.
    materials.glass.map?.dispose();
    materials.glass.dispose();
    materials.glass = new THREE.MeshBasicMaterial({ color: 0xfff1d2 });

    const obstacles = [];
    const buckets = new GeometryBuckets();

    const { group: roomGroup, obstacles: roomObstacles } = buildRoom(materials, buckets);
    this.scene.add(roomGroup);
    obstacles.push(...roomObstacles);

    buildBed(buckets, obstacles);
    buildNightstand(buckets, obstacles);
    buildDesk(buckets, obstacles);
    buildChair(buckets, obstacles);
    buildFloorClutter(buckets, obstacles);
    buildClosedCurtains(buckets);
    buildRug(buckets);
    buildPoster(buckets);

    // Lo pegado a la pared no proyecta sombra (ver BedroomScene): solo los muebles.
    const furnitureMeshes = buckets.buildMeshes(materials, {
      castShadow: true,
      receiveShadow: true,
    });
    const wallMounted = new Set(['poster', 'posterFrame', 'trim', 'metal', 'curtain']);
    for (const mesh of furnitureMeshes) {
      if (wallMounted.has(mesh.name.replace('furniture-', ''))) mesh.castShadow = false;
      this.scene.add(mesh);
    }

    this.diploma = buildDiploma(this.engine.renderer.capabilities.getMaxAnisotropy());
    this.scene.add(this.diploma.group);

    // Penumbra: lo único que alumbra de verdad es el haz.
    const { ambiente } = config.despertar;
    this.scene.add(new THREE.HemisphereLight(ambiente.cielo, ambiente.suelo, ambiente.intensidad));
    this.beam = buildLightBeam();
    this.scene.add(this.beam.group);

    this.collision = new Collision(config.player.radioColision);
    for (const box of obstacles) this.collision.addObstacle(box);

    this.interaction = new Interaction(this.engine.camera);
    this.interaction.register(
      this.diploma.hitbox,
      'Mirar el título',
      () => this.narrative.lookAtDiploma(),
      () => this.narrative.canLook(),
    );

    this.narrative = createDespertarNarrative({
      camera: this.engine.camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      stats: this.stats,
      interaction: this.interaction,
      collision: this.collision,
      beam: this.beam,
    });

    this._unsubscribers.push(this.input.onInteract(() => this.narrative.interact()));

    // La geometría es estática: una sola vez alcanza para el shadow map del haz.
    this.engine.requestShadowUpdate();
  }

  update(delta) {
    this.beam.update(delta);
    this.narrative.update(delta);
  }

  dispose() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
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
      if (object.isSpotLight) {
        object.map?.dispose();
        object.shadow.map?.dispose();
      }
    });
  }
}
