import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { createPhoneClock, parseTime } from '../../systems/PhoneClock.js';
import { gameState } from '../../core/gameState.js';
import { config } from '../../config.js';
import { bus, playerStart, freedSeat } from './layout.js';

// Frena con la puerta de atrás un poco más adelante del cartel de la parada: si quedara
// justo enfrente, el poste taparía la salida.
const STOP_ALIGN_X = (bus.backDoor.minX + bus.backDoor.maxX) / 2 - 1.4;

/**
 * Narrativa de la escena 3, arriba del colectivo lleno: no hay dónde sentarse. En una
 * parada se baja alguien y se libera un asiento, pero otro se sienta antes. Después
 * anuncian la parada de la facultad: hay que abrirse paso hasta la puerta de atrás,
 * tocar el timbre (E) y bajar (E) cuando frena (pasa a la escena 4).
 */
export function createBusRideNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  collision,
  interior,
  passengers,
  drive,
  strip,
  onGotOff,
}) {
  const viaje = config.viaje;
  const movement = createPlayerMovement({
    camera,
    input,
    collision,
    speed: viaje.velocidadCaminar,
  });

  // La hora y el celular siguen como quedaron en la parada (o desde config si se
  // arranca directo en esta escena).
  const phone = createPhoneClock({
    overlay,
    audio,
    startMinutes: gameState.clockMinutes ?? parseTime(viaje.horaInicio),
    received: gameState.phoneNotifications ?? [
      ...config.parada.notificacionesPrevias,
      ...config.parada.notificaciones,
    ],
    incoming: viaje.notificaciones,
    secondsPerMinute: viaje.segundosPorMinuto,
    battery: config.parada.bateriaCelular,
    onReceive: (item) => stats.message(item.de),
  });

  function showTimedText(ctx, text, seconds = 3.5) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
  }

  /** Si intenta caminar y no avanza (trabado entre la gente), cada tanto pide permiso. */
  function updatePermiso(delta, moved, ctx) {
    const m = input.move;
    const trying = m.forward || m.back || m.left || m.right;
    if (trying && moved < viaje.velocidadCaminar * delta * 0.3) ctx.blockedFor += delta;
    else ctx.blockedFor = 0;
    if (ctx.blockedFor > 0.5 && ctx.elapsed > ctx.permisoCooldownUntil && ctx.textHideAt === null) {
      showTimedText(ctx, '—Permiso… permiso…', 1.6);
      ctx.permisoCooldownUntil = ctx.elapsed + 6;
      stats.trigger('permiso');
    }
  }

  function distanceToSeat() {
    return Math.hypot(camera.position.x - freedSeat.x, camera.position.z - freedSeat.z);
  }

  function onIntermediateStop(ctx) {
    interior.setBackDoorOpen(true);
    ctx.dwellUntil = ctx.elapsed + viaje.esperaEnParadaSegundos;
    passengers.startLeaving(() => {
      ctx.seatFreedAt = ctx.elapsed;
      showTimedText(ctx, 'Se liberó un asiento…', 3);
      overlay.setObjective('¿Un asiento libre? · [R] mirar el celular');
    });
  }

  function stealSeat(ctx, playerWasClose) {
    ctx.seatTaken = true;
    passengers.takeSeat(() => {
      showTimedText(
        ctx,
        playerWasClose ? '…y te lo ganaron.' : 'Alguien se sentó en el asiento libre.',
        3,
      );
      stats.trigger(playerWasClose ? 'asientoGanado' : 'asientoOcupado');
      overlay.setObjective('Aguantá parado · [R] mirar el celular');
      ctx.announceAt = ctx.elapsed + viaje.anuncioFacultadSegundos;
    });
  }

  const states = {
    RIDING: {
      onEnter() {
        camera.position.set(playerStart.x, config.player.alturaOjos, playerStart.z);
        camera.quaternion.setFromEuler(new THREE.Euler(0, playerStart.yaw, 0, 'YXZ'));
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();
        overlay.hideFadeToBlack();
        overlay.setCrosshairVisible(true);
        overlay.setObjective('No hay dónde sentarse… · [R] mirar el celular');
        input.setLookEnabled(true);
      },
      onUpdate(delta, ctx) {
        ctx.moved = movement.update(delta);
        updatePermiso(delta, ctx.moved, ctx);
        interaction.update(delta * 1000);
        if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
        else overlay.hideHint();

        // Parada intermedia: frena en la próxima parada que le dé la distancia.
        if (!ctx.intermediateRequested && ctx.elapsed >= viaje.paradaIntermediaSegundos) {
          const remaining = strip.nextStop(STOP_ALIGN_X, drive.brakingDistance);
          if (remaining) {
            ctx.intermediateRequested = true;
            drive.stopAt(remaining, () => onIntermediateStop(ctx));
          }
        }
        // Termina la espera en la parada intermedia: cierra y arranca.
        if (ctx.dwellUntil !== null && ctx.elapsed >= ctx.dwellUntil && ctx.seatFreedAt !== null) {
          ctx.dwellUntil = null;
          interior.setBackDoorOpen(false);
          drive.resume();
        }
        // El asiento libre: otro se sienta cuando el jugador se acerca (o si tarda mucho).
        if (ctx.seatFreedAt !== null && !ctx.seatTaken) {
          const close = distanceToSeat() < viaje.distanciaAsiento;
          if (close || ctx.elapsed - ctx.seatFreedAt > viaje.asientoTimeoutSegundos) {
            stealSeat(ctx, close);
          }
        }
        // Anuncio de la parada de la facultad.
        if (ctx.announceAt !== null && ctx.elapsed >= ctx.announceAt) {
          ctx.announceAt = null;
          ctx.announced = true;
          showTimedText(ctx, `Próxima parada: ${viaje.paradaFinal}`, 4);
          overlay.setObjective('Tocá el timbre junto a la puerta de atrás [E]');
        }
        // Después del timbre: cuando aparece la facultad, frena ahí.
        if (ctx.bellRung && !ctx.campusStopRequested) {
          const distance = strip.campusStopDistance(STOP_ALIGN_X);
          if (distance !== null) {
            ctx.campusStopRequested = true;
            drive.stopAt(
              () => strip.campusStopDistance(STOP_ALIGN_X),
              () => {
                interior.setBackDoorOpen(true);
                ctx.arrived = true;
                showTimedText(ctx, viaje.paradaFinal, 3);
                overlay.setObjective('Bajá del colectivo [E]');
              },
            );
          }
        }
      },
      onExit() {
        overlay.hideHint();
        overlay.hideNarrativeText();
        overlay.setCrosshairVisible(false);
      },
    },

    // Se bajó: fundido y pasa a la escena 4 con la hora y el celular como quedaron.
    LEAVING: {
      onEnter(ctx) {
        ctx.timer = 0;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.hideToast();
        overlay.setObjective(null);
        overlay.showFadeToBlack(config.facultad.textoFundidoEntrada, stats.sceneDeltas());
        gameState.clockMinutes = phone.minutes;
        gameState.phoneNotifications = phone.notifications;
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (ctx.timer >= 2.5) ctx.machine.transition('END');
      },
    },

    END: {
      onEnter() {
        drive.dispose();
        audio.stopAll();
        onGotOff();
      },
    },
  };

  const context = {
    elapsed: 0,
    moved: 0,
    textHideAt: null,
    blockedFor: 0,
    permisoCooldownUntil: 0,
    intermediateRequested: false,
    dwellUntil: null,
    seatFreedAt: null,
    seatTaken: false,
    announceAt: null,
    announced: false,
    bellRung: false,
    campusStopRequested: false,
    arrived: false,
  };
  const machine = new StateMachine(states, 'RIDING', context);
  context.machine = machine;

  return {
    machine,
    canRingBell: () => machine.currentName === 'RIDING' && context.announced && !context.bellRung,
    canGetOff: () => machine.currentName === 'RIDING' && context.arrived,
    ringBell() {
      if (!(context.announced && !context.bellRung)) return;
      context.bellRung = true;
      audio.playBell();
      stats.trigger('timbre');
      interior.setStopRequested(true);
      showTimedText(context, 'Parada solicitada', 2.5);
      overlay.setObjective('Esperá a que frene en la facultad · [R] mirar el celular');
      strip.requestCampus();
    },
    getOff() {
      if (machine.currentName === 'RIDING' && context.arrived) machine.transition('LEAVING');
    },
    interact() {
      if (machine.currentName === 'RIDING') interaction.triggerInteract();
    },
    togglePhone() {
      if (machine.currentName === 'RIDING') overlay.setPhoneVisible(!overlay.isPhoneVisible);
    },
    update(delta) {
      context.moved = 0;
      context.elapsed += delta;
      if (machine.currentName !== 'END') phone.update(delta);
      if (context.textHideAt !== null && context.elapsed >= context.textHideAt) {
        overlay.hideNarrativeText();
        context.textHideAt = null;
      }
      // Bajo techo se seca un poco; los nervios suben con la hora (y más si anunciaron la
      // parada y todavía no tocó el timbre).
      if (machine.currentName === 'RIDING') {
        const hurry = context.announced && !context.bellRung;
        stats.addLatenessStress(
          phone.minutes,
          delta,
          hurry ? config.stats.apuroTimbrePorSegundo : 0,
        );
        stats.drift('mojado', -config.stats.secadoPorSegundo, delta);
      }
      machine.update(delta);
    },
  };
}
