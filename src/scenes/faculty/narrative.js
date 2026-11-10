import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { createPhoneClock, parseTime } from '../../systems/PhoneClock.js';
import { gameState } from '../../core/gameState.js';
import { pickByThreshold } from '../../core/PlayerStats.js';
import { config } from '../../config.js';
import {
  playerStart,
  roofHeightAt,
  isInsideStairHall,
  isInsideAulas400,
  isInCentralUpper,
} from './layout.js';

/**
 * Narrativa de la escena 4, en la UTN: entra por el acceso de autos, bajo la lluvia, y
 * tiene que encontrar el aula 411. A cielo abierto se moja; bajo la galería, el puente o
 * adentro se seca. El UTN FRC está cerrado, las puertas de abajo del Central también y la
 * de emergencia no abre desde afuera; la torre vidriada lleva al pasillo del Central (aulas
 * 200), que no es, y el Madders, al fondo, está cerrado. Los avisos del kiosco, el vidrio
 * del UTN FRC, el cartel del Central (o el grupo, si tarda) dicen que es en el 1° piso del
 * edificio de aulas 400, al lado del UTN FRC. En los pasillos hay que pedir permiso. En la puerta del aula 411 entra con E y
 * pasa al parcial.
 */
export function createFacultyNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  floors,
  onEntered,
}) {
  const facultad = config.facultad;
  const movement = createPlayerMovement({ camera, input, collision: floors });

  // La hora y el celular siguen como quedaron en el colectivo (o desde config si se
  // arranca directo en esta escena).
  const phone = createPhoneClock({
    overlay,
    audio,
    startMinutes: gameState.clockMinutes ?? parseTime(facultad.horaInicio),
    received: gameState.phoneNotifications ?? [
      ...config.parada.notificacionesPrevias,
      ...config.parada.notificaciones,
      ...config.viaje.notificaciones,
    ],
    incoming: facultad.notificaciones,
    secondsPerMinute: facultad.segundosPorMinuto,
    battery: config.parada.bateriaCelular,
    onReceive: (item) => stats.message(item.de),
  });

  const objectives = {
    buscar: `Encontrá el ${facultad.aula} · [R] mirar el celular`,
    edificio: 'Andá al edificio de aulas 400, al lado del UTN FRC · [R] celular',
    subir: `Subí al 1° piso: el ${facultad.aula} es arriba`,
    pasillo: `Buscá el ${facultad.aula} en el pasillo`,
  };

  function showTimedText(ctx, text, seconds = 3.5) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
  }

  /** Ya sabe que es en el edificio de aulas 400 (por los avisos, un cartel o el grupo). */
  function learnTheWay(ctx) {
    if (ctx.knowsWay) return;
    ctx.knowsWay = true;
    if (!ctx.inAulas400) overlay.setObjective(objectives.edificio);
  }

  /** Lugares a los que llega por primera vez: el pasillo del Central y el edificio de aulas 400. */
  function updatePlaces(ctx, x, z) {
    const floor = floors.floor;
    if (!ctx.sawCentral && isInCentralUpper(x, z, floor)) {
      ctx.sawCentral = true;
      say('centralArriba');
    }
    if (isInsideAulas400(x, z)) {
      ctx.inAulas400 = true;
      ctx.knowsWay = true;
      const objective = floor === 1 ? objectives.pasillo : objectives.subir;
      if (ctx.objective !== objective) {
        ctx.objective = objective;
        overlay.setObjective(objective);
      }
    }
  }

  /** Si intenta caminar y no avanza (trabado entre la gente), cada tanto pide permiso. */
  function updatePermiso(delta, moved, ctx) {
    const m = input.move;
    const trying = m.forward || m.back || m.left || m.right;
    const speed = config.player.velocidadCaminar;
    if (trying && moved < speed * delta * 0.3) ctx.blockedFor += delta;
    else ctx.blockedFor = 0;
    if (ctx.blockedFor > 0.6 && ctx.elapsed > ctx.permisoCooldownUntil && ctx.textHideAt === null) {
      showTimedText(ctx, '—Permiso… permiso…', 1.6);
      ctx.permisoCooldownUntil = ctx.elapsed + 6;
      stats.trigger('permiso');
    }
  }

  /** Caminar (y subir la escalera), mojarse o secarse, pedir permiso e interactuar. */
  function explore(delta, ctx) {
    const moved = movement.update(delta);
    const { x, z } = camera.position;
    // La altura sigue al piso con un poco de suavizado (escalones, cordones).
    const target = config.player.alturaOjos + floors.groundHeight(x, z);
    camera.position.y += (target - camera.position.y) * Math.min(1, delta * 14);
    updatePermiso(delta, moved, ctx);
    interaction.update(delta * 1000);
    if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
    else overlay.hideHint();

    const upstairs = floors.floor === 1;
    const sheltered = upstairs || roofHeightAt(x, z) < Infinity;
    if (sheltered) stats.drift('mojado', -config.stats.secadoPorSegundo, delta);
    else stats.drift('mojado', config.stats.lluviaMojadoPorSegundo, delta);
    audio.setRainMuffled(upstairs || isInsideStairHall(x, z));
    stats.addLatenessStress(phone.minutes, delta);
    updatePlaces(ctx, x, z);
  }

  const states = {
    // Recién entrado por el portón.
    ARRIVING: {
      onEnter(ctx) {
        floors.setFloor(0);
        camera.position.set(playerStart.x, config.player.alturaOjos, playerStart.z);
        camera.quaternion.setFromEuler(new THREE.Euler(0, playerStart.yaw, 0, 'YXZ'));
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();
        overlay.hideFadeToBlack();
        overlay.setCrosshairVisible(true);
        overlay.setObjective(objectives.buscar);
        input.setLookEnabled(true);
        // Del colectivo al portón, corriendo bajo la lluvia.
        stats.trigger('corriendoLluvia');
        showTimedText(ctx, pickByThreshold(facultad.textosLlegada, stats.get('mojado')), 3);
      },
      onUpdate(delta, ctx) {
        explore(delta, ctx);
        if (ctx.elapsed >= facultad.mensajeAlEntrarSegundos) ctx.machine.transition('SEARCHING');
      },
    },

    // Buscando el aula 500 (ya con el mensaje del grupo apurándolo).
    SEARCHING: {
      onEnter() {
        phone.deliver(facultad.mensajeAlEntrar);
      },
      onUpdate(delta, ctx) {
        explore(delta, ctx);
        // Si da vueltas sin saber adónde ir, el grupo le dice.
        if (!ctx.knowsWay && ctx.elapsed >= facultad.pista.segundos) {
          phone.deliver(facultad.pista.mensaje);
          learnTheWay(ctx);
        }
      },
      onExit() {
        overlay.hideHint();
        overlay.setCrosshairVisible(false);
      },
    },

    // Llegó a la puerta: pide permiso, fundido y pasa al parcial (escena 5).
    ENTERING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.faded = false;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.hideToast();
        overlay.setObjective(null);
        audio.setRainMuffled(true);
        showTimedText(ctx, facultad.textos.puertaAula, 2);
        gameState.clockMinutes = phone.minutes;
        gameState.phoneNotifications = phone.notifications;
        gameState.arrivalMinutes = phone.minutes;
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.faded && ctx.timer >= 1.8) {
          ctx.faded = true;
          overlay.showFadeToBlack(config.parcial.textoFundidoEntrada, stats.sceneDeltas());
        }
        if (ctx.timer >= 4.3) ctx.machine.transition('END');
      },
    },

    END: {
      onEnter() {
        audio.stopAll();
        onEntered();
      },
    },
  };

  const context = {
    elapsed: 0,
    textHideAt: null,
    blockedFor: 0,
    permisoCooldownUntil: 0,
    knowsWay: false,
    sawCentral: false,
    inAulas400: false,
    objective: null,
  };
  const machine = new StateMachine(states, 'ARRIVING', context);
  context.machine = machine;

  const isExploring = () =>
    machine.currentName === 'ARRIVING' || machine.currentName === 'SEARCHING';

  /**
   * Cosas que solo muestran un texto (puertas cerradas, el vidrio del UTN FRC, los avisos).
   * La primera vez cuentan para los stats; las que dan la pista, enseñan el camino.
   */
  function say(key) {
    if (!isExploring()) return;
    const { texto, evento, pista } = facultad.interacciones[key];
    showTimedText(context, texto, 5);
    if (evento) stats.trigger(evento, { once: true });
    if (pista) learnTheWay(context);
  }

  return {
    machine,
    isExploring,
    say,
    /** Mira por la mirilla de otra aula: nunca es la suya. */
    peek(number) {
      if (!isExploring()) return;
      const lines = facultad.mirillas;
      const line = lines[Number(number) % lines.length];
      showTimedText(context, `Aula ${number}: ${line}`, 3);
      stats.trigger('aulaEquivocada', { once: true });
    },
    canEnterAula: () => machine.currentName === 'SEARCHING',
    enterAula() {
      if (machine.currentName === 'SEARCHING') machine.transition('ENTERING');
    },
    interact() {
      if (isExploring()) interaction.triggerInteract();
    },
    togglePhone() {
      if (isExploring()) overlay.setPhoneVisible(!overlay.isPhoneVisible);
    },
    update(delta) {
      context.elapsed += delta;
      if (machine.currentName !== 'END') phone.update(delta);
      if (context.textHideAt !== null && context.elapsed >= context.textHideAt) {
        overlay.hideNarrativeText();
        context.textHideAt = null;
      }
      machine.update(delta);
    },
  };
}
