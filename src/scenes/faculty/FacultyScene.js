import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { config } from '../../config.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildSky, buildRain } from '../../world/weather.js';
import { WetReflection } from '../../world/wetReflection.js';
import { mergeParts } from '../../world/lowPoly.js';
import { createRainOnGlassTexture, createTileFloorTexture } from '../../utils/textures.js';
import { createBuildContext } from './buildKit.js';
import { buildCampusGround } from './campusGround.js';
import { buildCampusBuildings } from './campusBuildings.js';
import { buildStairTower } from './stairTower.js';
import { buildCampusProps } from './campusProps.js';
import { buildUpperFloor } from './upperFloor.js';
import { buildAulas400 } from './aulas400.js';
import { buildStudents } from './students.js';
import { createFloors } from './floors.js';
import { createFacultyNarrative } from './narrative.js';
import { bounds, roofHeightAt } from './layout.js';

/**
 * Escena 4: la UTN FRC, del acceso de autos al aula 411 (armada a partir de fotos del patio
 * central y del plano del predio). El jugador llega empapado, bajo la lluvia, y tiene que
 * encontrar el aula: el estacionamiento, el sendero, la galería del Edificio Central, el
 * patio de adoquines (la torre vidriada lleva al Central, que no es) y, del lado de
 * Maestro López, el edificio de aulas 400, con el aula 411 en el 1° piso.
 */
export class FacultyScene {
  constructor({ engine, input, audio, overlay, stats, goTo }) {
    this.engine = engine;
    this.goTo = goTo;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];

    const { niebla } = config.facultad;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    this.scene.fog = new THREE.Fog(config.exterior.nieblaColor, niebla.cerca, niebla.lejos);
  }

  init() {
    const camera = this.engine.camera;
    // El campus es grande: se ve más lejos que en las otras escenas (la antena, el fondo).
    camera.far = config.facultad.distanciaVision;
    camera.updateProjectionMatrix();

    const anisotropy = this.engine.renderer.capabilities.getMaxAnisotropy();
    this.reflection = new WetReflection({ y: 0 });

    const group = new THREE.Group();
    group.name = 'faculty';
    const ctx = createBuildContext(group);
    this.ground = buildCampusGround({ reflection: this.reflection, parts: ctx.parts, anisotropy });
    group.add(this.ground.group);
    buildCampusBuildings(ctx);
    buildStairTower(ctx);
    buildCampusProps(ctx);
    buildUpperFloor(ctx);
    buildAulas400(ctx);
    for (const b of bounds) ctx.block(0, b.minX, b.minZ, b.maxX, b.maxZ);

    group.add(
      mergeParts(ctx.parts, 'campus-static'),
      mergeParts(
        ctx.interior,
        'corridor-static',
        new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
      ),
    );
    const glass = new THREE.Mesh(
      mergeGeometries(ctx.glass),
      new THREE.MeshBasicMaterial({
        map: createRainOnGlassTexture(),
        color: 0xc8d4dc,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    for (const geo of ctx.glass) geo.dispose();
    glass.name = 'glass';
    group.add(glass);
    // Pisos de mosaico de los pasillos.
    const tiles = createTileFloorTexture();
    tiles.anisotropy = anisotropy;
    const floorTiles = new THREE.Mesh(
      mergeGeometries(ctx.floorGeos),
      new THREE.MeshBasicMaterial({ map: tiles, color: 0xe2ded6, fog: false }),
    );
    for (const geo of ctx.floorGeos) geo.dispose();
    floorTiles.name = 'floor-tiles';
    group.add(floorTiles);
    this.scene.add(group);

    const students = buildStudents();
    this.scene.add(students.mesh);

    // Cielo y lluvia acompañan al jugador; la lluvia no cae bajo los techos.
    this.sky = buildSky(config.facultad.distanciaVision - 15);
    this.scene.add(this.sky);
    this.rain = buildRain({
      count: 3200,
      area: { minX: -15, maxX: 15, minY: -0.1, maxY: 12, minZ: -15, maxZ: 15 },
      roofHeightAt,
    });
    this.scene.add(this.rain.mesh);

    this.floors = createFloors(config.player.radioColision, [
      [...ctx.obstacles[0], ...students.obstacles[0]],
      [...ctx.obstacles[1], ...students.obstacles[1]],
    ]);

    this.interaction = new Interaction(camera);
    const exploring = () => this.narrative.isExploring();
    const say = (key) => () => this.narrative.say(key);
    const { hitboxes } = ctx;
    this.interaction.register(
      hitboxes.emergencyDoor,
      'Probar la puerta',
      say('puertaEmergencia'),
      exploring,
    );
    for (const mesh of hitboxes.labDoors) {
      this.interaction.register(mesh, 'Probar la puerta', say('puertaLaboratorio'), exploring);
    }
    this.interaction.register(
      hitboxes.frcDoors,
      'Entrar al edificio',
      say('edificioFrc'),
      exploring,
    );
    this.interaction.register(hitboxes.notices, 'Leer los avisos', say('avisos'), exploring);
    this.interaction.register(
      hitboxes.maddersDoor,
      'Probar la puerta',
      say('edificioMadders'),
      exploring,
    );
    this.interaction.register(
      hitboxes.lobby400Door,
      'Probar la puerta',
      say('puertaPlantaBaja'),
      exploring,
    );
    // Las otras aulas (y la del fondo del Central): se puede mirar por la mirilla.
    const peekable = [
      ...hitboxes.centralClassrooms,
      { number: '209', mesh: hitboxes.centralEndDoor },
      ...hitboxes.aulas400Classrooms,
    ];
    for (const { number, mesh } of peekable) {
      this.interaction.register(
        mesh,
        'Mirar por la mirilla',
        () => this.narrative.peek(number),
        exploring,
      );
    }
    this.interaction.register(
      hitboxes.aula411,
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
      onEntered: () => this.goTo('parcial'),
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
    this.narrative.update(delta);
  }

  /** Reflejos del piso mojado, con la cámara ya lista para el frame. */
  beforeRender() {
    this.reflection.update(this.engine.renderer, this.scene, this.engine.camera);
  }

  dispose() {
    for (const unsubscribe of this._unsubscribers) unsubscribe();
    this._unsubscribers = [];
    const camera = this.engine.camera;
    camera.far = config.player.far;
    camera.updateProjectionMatrix();
    this.reflection?.dispose();
    this.ground?.dispose();
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
