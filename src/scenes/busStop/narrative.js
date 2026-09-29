import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { config } from '../../config.js';
import { playerStart } from './layout.js';

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
 * Narrativa de la parada del colectivo: esperar bajo la lluvia (caminando por la
 * vereda, mirando el celular con R) hasta que llega el colectivo y subirse.
 * La hora del juego corre acelerada y las notificaciones llegan según esa hora.
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

  function gameMinutes(ctx) {
    return startMinutes + ctx.elapsed / parada.segundosPorMinuto;
  }

  function updateClock(ctx) {
    const minutes = gameMinutes(ctx);
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
      if (!overlay.isPhoneVisible)
        overlay.showToast(`📳 ${item.de}: nuevo mensaje · [R] ver celular`);
    }
  }

  const states = {
    WAITING: {
      onEnter(ctx) {
        camera.position.set(playerStart.x, config.player.alturaOjos, playerStart.z);
        camera.quaternion.setFromEuler(new THREE.Euler(0, playerStart.yaw, 0, 'YXZ'));
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();

        overlay.hideFadeToBlack();
        overlay.setCrosshairVisible(true);
        overlay.setObjective('Esperá el colectivo · [R] mirar el celular');
        input.setLookEnabled(true);
        ctx.busAnnouncedAt = null;
      },
      onUpdate(delta, ctx) {
        ctx.moved = movement.update(delta);

        if (!traffic.bus.isComing && ctx.elapsed >= parada.colectivoApareceSegundos) {
          traffic.spawnBus();
        }
        // El cartel de "llegó" se va solo a los pocos segundos.
        if (ctx.busAnnouncedAt !== null && ctx.elapsed - ctx.busAnnouncedAt > 3.5) {
          overlay.hideNarrativeText();
          ctx.busAnnouncedAt = null;
        }

        interaction.update(delta * 1000);
        if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
        else overlay.hideHint();
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

  const context = { elapsed: 0, moved: 0 };
  overlay.setPhoneBattery(parada.bateriaCelular);
  overlay.setPhoneNotifications(received);
  updateClock(context);

  const machine = new StateMachine(states, 'WAITING', context);
  context.machine = machine;

  traffic.bus.onArrived(() => {
    if (machine.currentName !== 'WAITING') return;
    overlay.showNarrativeText(`¡Llegó el ${parada.linea}!`);
    overlay.setObjective('Subí al colectivo [E]');
    context.busAnnouncedAt = context.elapsed;
  });

  return {
    machine,
    /** E o click: interactuar con lo que está bajo la mira (la puerta del colectivo). */
    interact() {
      if (machine.currentName === 'WAITING') interaction.triggerInteract();
    },
    board() {
      if (machine.currentName === 'WAITING' && traffic.bus.isStopped) {
        machine.transition('BOARDING');
      }
    },
    togglePhone() {
      if (machine.currentName === 'WAITING') overlay.setPhoneVisible(!overlay.isPhoneVisible);
    },
    update(delta) {
      context.moved = 0;
      if (machine.currentName !== 'END') {
        context.elapsed += delta;
        updateClock(context);
      }
      machine.update(delta);
      puddles.update(delta, context.moved);
    },
  };
}
