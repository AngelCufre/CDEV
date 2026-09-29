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
import { buildNotes } from './props/notes.js';
import { loadNotesPages } from './notesPages.js';
import { Collision } from '../../systems/Collision.js';
import { Interaction } from '../../systems/Interaction.js';
import { createNarrative } from './narrative.js';
import { buildOutdoor } from './outdoor.js';

/**
 * Escena de la habitación: el estudiante se despierta, se levanta y descubre
 * que llega tarde al parcial. Implementa la interfaz común init/update/dispose
 * que espera SceneManager.
 */
export class BedroomScene {
  constructor({ engine, input, audio, overlay, goTo }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.goTo = goTo;
    this._unsubscribers = [];
    this.scene = new THREE.Scene();
    // Afuera está nublado y llueve: fondo y niebla del mismo gris que el horizonte
    // del cielo, para que el paisaje se funda con la distancia.
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    this.scene.fog = new THREE.Fog(
      config.exterior.nieblaColor,
      config.exterior.nieblaCerca,
      config.exterior.nieblaLejos,
    );
  }

  init() {
    const materials = createBedroomMaterials();
    const obstacles = [];
    const buckets = new GeometryBuckets();

    const { group: roomGroup, obstacles: roomObstacles, doorMesh } = buildRoom(materials);
    this.scene.add(roomGroup);
    obstacles.push(...roomObstacles);

    buildBed(buckets, obstacles);
    const { topY: nightstandTopY } = buildNightstand(buckets, obstacles);
    const { topY: deskTopY } = buildDesk(buckets, obstacles);
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

    const notesPages = loadNotesPages();
    const notes = buildNotes(
      notesPages,
      deskTopY,
      this.engine.renderer.capabilities.getMaxAnisotropy(),
    );
    this.scene.add(notes.group);

    const { group: lightsGroup } = buildLights();
    this.scene.add(lightsGroup);

    this.outdoor = buildOutdoor();
    this.scene.add(this.outdoor.group);

    this.collision = new Collision(config.player.radioColision);
    for (const box of obstacles) this.collision.addObstacle(box);

    this.interaction = new Interaction(this.engine.camera);
    // Despertador y celular disparan el "darse cuenta" una sola vez; la puerta recién
    // sirve después, cuando ya sabe que llega tarde.
    const beforeRealizing = () => !this.narrative.hasRealized;
    const afterRealizing = () => this.narrative.hasRealized;
    this.interaction.register(
      clock.interactableMesh,
      'Mirar el despertador',
      () => this.narrative.requestRealization(),
      beforeRealizing,
    );
    this.interaction.register(
      phone.interactableMesh,
      'Mirar el celular',
      () => this.narrative.requestRealization(),
      beforeRealizing,
    );
    this.interaction.register(notes.interactableMesh, 'Leer los apuntes', () =>
      this.narrative.openNotes(),
    );
    this.interaction.register(
      doorMesh,
      'Salir de la habitación',
      () => this.narrative.leaveRoom(),
      afterRealizing,
    );

    this.narrative = createNarrative({
      camera: this.engine.camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      interaction: this.interaction,
      collision: this.collision,
      notesPages,
      onLeave: () => this.goTo('parada'),
    });

    this._onInteractPress = () => {
      const state = this.narrative.machine.currentName;
      if (state === 'EXPLORING') {
        this.interaction.triggerInteract();
      } else if (state === 'READING') {
        this.narrative.closeNotes();
      }
    };
    this._unsubscribers.push(
      this.input.onInteract(this._onInteractPress),
      this.input.onKeyDown((code, key) => this.narrative.handleKey(code, key)),
      this.input.onWheel((deltaY) => this.narrative.handleWheel(deltaY)),
      this.input.onPointerMove((dx, dy) => this.narrative.handlePointerMove(dx, dy)),
      // Con el puntero bloqueado, el navegador se queda con el Esc y no lo manda como
      // tecla: se detecta por la pérdida del pointer lock y se cierra el visor.
      this.input.onLockChange((locked) => {
        if (!locked) this.narrative.closeNotes();
      }),
    );

    // La geometría estática ya está armada: alcanza con un único recalculo del shadow map.
    this.engine.requestShadowUpdate();
  }

  update(delta) {
    this.outdoor.update(delta);
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
