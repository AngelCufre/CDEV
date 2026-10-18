import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { createPhoneClock, parseTime } from '../../systems/PhoneClock.js';
import { gameState } from '../../core/gameState.js';
import { config } from '../../config.js';
import { playerStart, busStop, sidewalk, busStopArrivalDistance } from './layout.js';

/**
 * Narrativa de la parada del colectivo: sale de su casa, camina hasta la parada y
 * espera bajo la lluvia. El primer colectivo viene lleno y no para; el segundo sí,
 * y se sube con E (pasa a la escena 3, arriba del colectivo). La hora del juego corre
 * acelerada desde que sale de la casa y las notificaciones llegan al celular (R).
 */
export function createBusStopNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  collision,
  puddles,
  traffic,
  onBoarded,
}) {
  const parada = config.parada;
  const movement = createPlayerMovement({ camera, input, collision });
  // Última posición en X de cada vehículo, para saber cuándo pasa a la altura del jugador.
  const vehicleLastX = new WeakMap();

  // Lo que ya estaba en el celular desde la habitación, más lo que va llegando.
  const phone = createPhoneClock({
    overlay,
    audio,
    startMinutes: parseTime(parada.horaInicio),
    received: parada.notificacionesPrevias,
    incoming: parada.notificaciones,
    secondsPerMinute: parada.segundosPorMinuto,
    battery: parada.bateriaCelular,
    onReceive: (item) => stats.message(item.de),
  });

  /** Texto narrativo que se va solo a los `seconds` segundos. */
  function showTimedText(ctx, text, seconds = 3.5) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
  }

  /** Caminar, pisar charcos e interactuar: lo que se puede hacer mientras va y espera. */
  function explore(delta, ctx) {
    ctx.moved = movement.update(delta);
    interaction.update(delta * 1000);
    if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
    else overlay.hideHint();
  }

  /**
   * Un auto (o el colectivo lleno) que pasa por el carril de la vereda te salpica si
   * estás cerca del cordón: se detecta cuando cruza la X del jugador. Después hay un
   * rato de gracia para que no te empape cada auto.
   */
  function updateVehicleSplashes(ctx) {
    const { distanciaCordon, velocidadMinima, esperaSegundos } = config.stats.salpicadura;
    const playerX = camera.position.x;
    const nearCurb = camera.position.z < sidewalk.nearZ + distanciaCordon;
    traffic.forEachNearCurbVehicle((object, speed, isBus) => {
      const x = object.position.x;
      const lastX = vehicleLastX.get(object);
      vehicleLastX.set(object, x);
      // Sin posición anterior, o recién reaparecido en la otra punta de la calle.
      if (lastX === undefined || Math.abs(x - lastX) > 2) return;
      const crossed = lastX < playerX && x >= playerX;
      if (!crossed || !nearCurb || speed < velocidadMinima) return;
      if (ctx.elapsed < ctx.splashGraceUntil) return;
      ctx.splashGraceUntil = ctx.elapsed + esperaSegundos;
      audio.playSplash(2);
      stats.trigger(isBus ? 'salpicadaColectivo' : 'salpicadaAuto');
      if (ctx.textHideAt === null) {
        showTimedText(ctx, isBus ? '¡Encima te empapó!' : '¡Splash! Alejate del cordón…', 2.5);
      }
    });
  }

  function isAtBusStop() {
    return (
      Math.abs(camera.position.x - busStop.x) < busStopArrivalDistance &&
      camera.position.z < sidewalk.farZ
    );
  }

  const states = {
    // Sale por la puerta de su casa y camina hasta la parada.
    GOING: {
      onEnter() {
        camera.position.set(playerStart.x, config.player.alturaOjos, playerStart.z);
        camera.quaternion.setFromEuler(new THREE.Euler(0, playerStart.yaw, 0, 'YXZ'));
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();

        overlay.hideFadeToBlack();
        overlay.setCrosshairVisible(true);
        overlay.setObjective(`Caminá hasta la parada del ${parada.linea} · [R] mirar el celular`);
        input.setLookEnabled(true);
      },
      onUpdate(delta, ctx) {
        explore(delta, ctx);
        if (isAtBusStop()) ctx.machine.transition('WAITING');
      },
    },

    // En la parada: pasa el lleno, después llega el que para.
    WAITING: {
      onEnter(ctx) {
        ctx.waited = 0;
        ctx.nextBusAt = parada.primerColectivoSegundos;
        ctx.nextBusFull = true;
        overlay.setObjective('Esperá el colectivo · [R] mirar el celular');
      },
      onUpdate(delta, ctx) {
        explore(delta, ctx);
        ctx.waited += delta;
        if (ctx.nextBusAt !== null && ctx.waited >= ctx.nextBusAt) {
          traffic.spawnBus({ full: ctx.nextBusFull });
          ctx.nextBusAt = null;
        }
      },
      onExit() {
        overlay.hideHint();
        overlay.hideNarrativeText();
        overlay.setCrosshairVisible(false);
      },
    },

    // Subió al colectivo: fundido y pasa a la escena 3 con la hora y el celular como
    // quedaron.
    BOARDING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.left = false;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.hideToast();
        overlay.setObjective(null);
        overlay.showFadeToBlack(config.viaje.textoFundidoEntrada, stats.sceneDeltas());
        gameState.clockMinutes = phone.minutes;
        gameState.phoneNotifications = phone.notifications;
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.left && ctx.timer >= 2.5) {
          ctx.left = true;
          traffic.stopSounds();
          onBoarded();
        }
      },
    },
  };

  const context = { elapsed: 0, moved: 0, textHideAt: null, splashGraceUntil: 0 };

  const machine = new StateMachine(states, 'GOING', context);
  context.machine = machine;

  traffic.bus.onEvent((event, { full }) => {
    if (machine.currentName !== 'WAITING') return;
    const linea = parada.linea;
    if (event === 'approaching') {
      showTimedText(context, full ? `¡Ahí viene el ${linea}!` : `Ahí viene otro ${linea}…`, 3);
    } else if (event === 'passed' && full) {
      showTimedText(context, 'Viene lleno… ¡No para!', 3.5);
      overlay.setObjective('Esperá el próximo · [R] mirar el celular');
      stats.trigger('colectivoLleno');
    } else if (event === 'gone' && full) {
      context.nextBusAt = context.waited + parada.segundoColectivoSegundos;
      context.nextBusFull = false;
    } else if (event === 'arrived') {
      showTimedText(context, `¡Llegó el ${linea}!`, 3.5);
      overlay.setObjective('Subí al colectivo [E]');
      stats.trigger('llegoColectivo');
    }
  });

  const isExploring = () => machine.currentName === 'GOING' || machine.currentName === 'WAITING';

  return {
    machine,
    /** E o click: interactuar con lo que está bajo la mira (la puerta del colectivo). */
    interact() {
      if (isExploring()) interaction.triggerInteract();
    },
    board() {
      if (machine.currentName === 'WAITING' && traffic.bus.isStopped) {
        machine.transition('BOARDING');
      }
    },
    togglePhone() {
      if (isExploring()) overlay.setPhoneVisible(!overlay.isPhoneVisible);
    },
    update(delta) {
      context.moved = 0;
      context.elapsed += delta;
      if (machine.currentName !== 'BOARDING') phone.update(delta);
      if (context.textHideAt !== null && context.elapsed >= context.textHideAt) {
        overlay.hideNarrativeText();
        context.textHideAt = null;
      }
      machine.update(delta);

      const splashed = puddles.update(delta, context.moved);
      if (splashed === 'entered') stats.trigger('charco');
      else if (splashed === 'step') stats.add({ mojado: config.stats.mojadoPorPisada });

      // Afuera, sin techo ni paraguas: se moja y se pone nervioso por la hora.
      if (isExploring()) {
        stats.drift('mojado', config.stats.lluviaMojadoPorSegundo, delta);
        stats.addLatenessStress(phone.minutes, delta);
        updateVehicleSplashes(context);
      }
    },
  };
}
