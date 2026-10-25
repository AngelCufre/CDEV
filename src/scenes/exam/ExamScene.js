import * as THREE from 'three';
import { config } from '../../config.js';
import { Interaction } from '../../systems/Interaction.js';
import { buildClassroom } from './buildClassroom.js';
import { buildExamPages } from './examPages.js';
import { createDeskItems } from './deskItems.js';
import { createProfessor } from './professor.js';
import { createExamNarrative } from './narrative.js';
import { professorLoop } from './layout.js';

/**
 * Escena 5: el parcial, en el aula 411. El jugador está sentado en su banco (no camina):
 * lee el parcial con E mientras corre el reloj, levanta las hojas que vuela el viento y
 * la lapicera, y al final entrega cuando la profesora viene a buscarlo.
 */
export class ExamScene {
  constructor({ engine, input, audio, overlay, stats }) {
    this.engine = engine;
    this.input = input;
    this.audio = audio;
    this.overlay = overlay;
    this.stats = stats;
    this._unsubscribers = [];

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.exterior.nieblaColor);
    // El aula entera queda más cerca que el comienzo de la niebla: solo afecta lo de afuera.
    this.scene.fog = new THREE.Fog(config.exterior.nieblaColor, 14, 45);
  }

  init() {
    const camera = this.engine.camera;
    const maxAnisotropy = this.engine.renderer.capabilities.getMaxAnisotropy();

    this.classroom = buildClassroom({ maxAnisotropy });
    this.scene.add(this.classroom.group);

    this.desk = createDeskItems({
      pages: buildExamPages(),
      deskTopY: this.classroom.deskTopY,
      maxAnisotropy,
      audio: this.audio,
    });
    this.scene.add(this.desk.group);

    const { velocidad, pausaAdelanteSegundos } = config.parcial.profesora;
    this.professor = createProfessor({
      loop: professorLoop,
      speed: velocidad,
      pauseSeconds: pausaAdelanteSegundos,
    });
    this.scene.add(this.professor.group);

    this.interaction = new Interaction(camera);
    this.narrative = createExamNarrative({
      camera,
      overlay: this.overlay,
      audio: this.audio,
      input: this.input,
      stats: this.stats,
      interaction: this.interaction,
      desk: this.desk,
      professor: this.professor,
      classroom: this.classroom,
    });

    const narrative = this.narrative;
    this.interaction.register(
      this.desk.readHitbox,
      'Leer el parcial',
      () => narrative.openExam(),
      () => narrative.canRead(),
    );
    for (const sheet of this.desk.sheets) {
      this.interaction.register(
        sheet.hitbox,
        'Levantar la hoja',
        () => narrative.pickUpSheet(sheet),
        () => sheet.state === 'floor' && narrative.canPickUp(),
      );
    }
    this.interaction.register(
      this.desk.pen.hitbox,
      'Levantar la lapicera',
      () => narrative.pickUpPen(),
      () => this.desk.pen.state === 'floor' && narrative.canPickUp(),
    );

    this._unsubscribers.push(
      this.input.onInteract(() => narrative.interact()),
      this.input.onKeyDown((code, key) => {
        if (code === 'KeyR') narrative.togglePhone();
        else narrative.handleKey(code, key);
      }),
      this.input.onWheel((deltaY) => narrative.handleWheel(deltaY)),
      this.input.onPointerMove((dx, dy) => narrative.handlePointerMove(dx, dy)),
      // Con el puntero bloqueado, el Esc lo toma el navegador: se cierra el parcial.
      this.input.onLockChange((locked) => narrative.handleLockChange(locked)),
    );

    this.audio.playRain();
    this.audio.playAmbient();
  }

  update(delta) {
    this.classroom.rain.update(delta);
    this.desk.update(delta);
    this.professor.update(delta);
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
