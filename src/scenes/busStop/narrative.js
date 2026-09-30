import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { config } from '../../config.js';
import { playerStart, busStop, sidewalk, busStopArrivalDistance } from './layout.js';

function parseTime(text) {
  const [hours, minutes] = text.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Narrativa de la parada del colectivo: sale de su casa, camina hasta la parada y
 * espera bajo la lluvia. El primer colectivo viene lleno y no para; el segundo sí,
 * y se sube con E. La hora del juego corre acelerada desde que sale de la casa y las
 * notificaciones llegan al celular (R) según esa hora.
 */
export function createBusStopNarrative({
  camera,
  overlay,
  audio,
  input,
  interaction,
  collision,
  puddles,
  traffic,
}) {
  const parada = config.parada;
  const movement = createPlayerMovement({ camera, input, collision });
  const startMinutes = parseTime(parada.horaInicio);

  // Lo que ya estaba en el celular desde la habitación, más lo que va llegando.
  const received = parada.notificacionesPrevias.map((item) => ({ ...item }));
  const pending = parada.notificaciones
    .map((item) => ({ ...item, minuto: parseTime(item.hora) }))
    .sort((a, b) => a.minuto - b.minuto);

  let lastShownTime = '';

  function updateClock(ctx) {
    const minutes = startMinutes + ctx.elapsed / parada.segundosPorMinuto;
    const text = formatTime(minutes);
    if (text !== lastShownTime) {
      lastShownTime = text;
      overlay.setPhoneTime(text);
    }
    while (pending.length > 0 && pending[0].minuto <= minutes) {
      const item = pending.shift();
      received.push(item);
      overlay.setPhoneNotifications(received);
      audio.playVibration();
      if (!overlay.isPhoneVisible) {
        overlay.showToast(`📳 ${item.de}: nuevo mensaje · [R] ver celular`);
      }
    }
  }

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

    // Subió al colectivo: fundido y fin de la escena.
    BOARDING: {
      onEnter(ctx) {
        ctx.timer = 0;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.hideToast();
        overlay.setObjective(null);
        overlay.showFadeToBlack('Continuará…');
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (ctx.timer >= 2.5) ctx.machine.transition('END');
      },
    },

    END: {
      onEnter() {
        traffic.stopSounds();
        audio.stopAll();
      },
    },
  };

  const context = { elapsed: 0, moved: 0, textHideAt: null };
  overlay.setPhoneBattery(parada.bateriaCelular);
  overlay.setPhoneNotifications(received);
  updateClock(context);

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
    } else if (event === 'gone' && full) {
      context.nextBusAt = context.waited + parada.segundoColectivoSegundos;
      context.nextBusFull = false;
    } else if (event === 'arrived') {
      showTimedText(context, `¡Llegó el ${linea}!`, 3.5);
      overlay.setObjective('Subí al colectivo [E]');
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
      if (machine.currentName !== 'END') {
        context.elapsed += delta;
        updateClock(context);
      }
      if (context.textHideAt !== null && context.elapsed >= context.textHideAt) {
        overlay.hideNarrativeText();
        context.textHideAt = null;
      }
      machine.update(delta);
      puddles.update(delta, context.moved);
    },
  };
}
