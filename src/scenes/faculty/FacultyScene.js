import * as THREE from 'three';
import { config } from '../../config.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildSky, buildRain } from '../../world/weather.js';
import { buildBuilding } from './buildBuilding.js';
import { buildStudents } from './students.js';
import { createFloors } from './floors.js';
import { createFacultyNarrative } from './narrative.js';
import { hall } from './layout.js';

/**
 * Escena 4: adentro del Edificio Gallardo (BOCETO, con un edificio inventado hasta tener
 * fotos). El jugador entra empapado y tiene que encontrar el aula 500, la del parcial:
 * recorre el hall y el pasillo lleno de gente; la escalera es un desvío.
 */
export class FacultyScene {
  constructor({ engine, input, audio, overlay, stats }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    // Solo afecta lo de afuera (el interior usa materiales con fog: false).
    this.scene.fog = new THREE.Fog(config.exterior.nieblaColor, 4, 32);
  }

  init() {
    const camera = this.engine.camera;

    const building = buildBuilding({
      anisotropy: this.engine.renderer.capabilities.getMaxAnisotropy(),
    });
    this.scene.add(building.group);

    const students = buildStudents();
    this.scene.add(students.mesh);

    // Afuera, del otro lado de la puerta vidriada: cielo y lluvia.
    const sky = buildSky(40);
    sky.position.x = hall.minX;
    // El edificio es más largo que el radio del cielo: se dibuja primero y sin escribir
    // profundidad, como fondo, para que nunca tape las paredes del fondo.
    sky.material.depthWrite = false;
    sky.renderOrder = -1;
    this.scene.add(sky);
    this.rain = buildRain({
      count: 1500,
      area: { minX: -16, maxX: hall.minX - 0.4, minY: -0.05, maxY: 9, minZ: -10, maxZ: 10 },
    });
    this.scene.add(this.rain.mesh);

    this.floors = createFloors(config.player.radioColision, [
      [...building.obstacles[0], ...students.obstacles[0]],
      [...building.obstacles[1], ...students.obstacles[1]],
    ]);

    this.interaction = new Interaction(camera);
    const exploring = () => this.narrative.isExploring();
    const { hitboxes } = building;
    this.interaction.register(
      hitboxes.elevator,
      'Llamar al ascensor',
      () => this.narrative.callElevator(),
      exploring,
    );
    this.interaction.register(
      hitboxes.bedelia,
      'Preguntar en bedelía',
      () => this.narrative.askBedelia(),
      exploring,
    );
    this.interaction.register(
      hitboxes.directory,
      'Leer el directorio',
      () => this.narrative.readDirectory(),
      exploring,
    );
    this.interaction.register(
      hitboxes.aula500,
      `Entrar al ${config.facultad.aula}`,
      () => this.narrative.enterAula(),
      () => this.narrative.canEnterAula(),
    );

    this.narrative = createFacultyNarrative({
      camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      stats: this.stats,
      interaction: this.interaction,
      floors: this.floors,
    });

    this._unsubscribers.push(
      this.input.onInteract(() => this.narrative.interact()),
      this.input.onKeyDown((code) => {
        if (code === 'KeyR') this.narrative.togglePhone();
      }),
    );

    this.audio.playRain();
    this.audio.playAmbient();
  }

  update(delta) {
    this.rain.update(delta);
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
    });
  }
}
