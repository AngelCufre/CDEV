import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { createPhoneClock, parseTime } from '../../systems/PhoneClock.js';
import { gameState } from '../../core/gameState.js';
import { pickByThreshold } from '../../core/PlayerStats.js';
import { config } from '../../config.js';
import { playerStart } from './layout.js';

/**
 * Narrativa de la escena 4, adentro del Edificio Gallardo: entra empapado y tiene que
 * encontrar el aula 500 (planta baja). El directorio del hall no la nombra, el ascensor no
 * anda, en el pasillo hay que pedir permiso y la escalera lleva a otras aulas. Cuando
 * llega a la puerta del aula 500, entra con E y se muestra el resumen del día.
 */
export function createFacultyNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  floors,
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

  function showTimedText(ctx, text, seconds = 3.5) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
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

  /** Caminar (y subir la escalera), pedir permiso e interactuar. */
  function explore(delta, ctx) {
    const moved = movement.update(delta);
    camera.position.y =
      config.player.alturaOjos + floors.groundHeight(camera.position.x, camera.position.z);
    updatePermiso(delta, moved, ctx);
    interaction.update(delta * 1000);
    if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
    else overlay.hideHint();
    // La 500 está en planta baja: subir es perder tiempo.
    if (floors.floor === 1) stats.trigger('pisoEquivocado', { once: true });
    // Bajo techo se seca un poco; los nervios siguen subiendo con la hora.
    stats.addLatenessStress(phone.minutes, delta);
    stats.drift('mojado', -config.stats.secadoPorSegundo, delta);
  }

  const states = {
    // Recién entrado por la puerta vidriada.
    ARRIVING: {
      onEnter(ctx) {
        floors.setFloor(0);
        camera.position.set(playerStart.x, config.player.alturaOjos, playerStart.z);
        camera.quaternion.setFromEuler(new THREE.Euler(0, playerStart.yaw, 0, 'YXZ'));
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();
        overlay.hideFadeToBlack();
        overlay.setCrosshairVisible(true);
        overlay.setObjective(`Encontrá el ${facultad.aula} · [R] mirar el celular`);
        input.setLookEnabled(true);
        // Del colectivo a la puerta, corriendo bajo la lluvia.
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
      },
      onExit() {
        overlay.hideHint();
        overlay.setCrosshairVisible(false);
      },
    },

    // Llegó a la puerta: pide permiso, fundido y resumen del día (por ahora, el final).
    ENTERING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.faded = false;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.hideToast();
        overlay.setObjective(null);
        showTimedText(ctx, facultad.textos.puertaAula, 2);
        gameState.clockMinutes = phone.minutes;
        gameState.phoneNotifications = phone.notifications;
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.faded && ctx.timer >= 1.8) {
          ctx.faded = true;
          overlay.showFadeToBlack('Continuará…', stats.sceneDeltas());
        }
        if (ctx.timer >= 4.3) ctx.machine.transition('END');
      },
    },

    END: {
      onEnter() {
        audio.stopAll();
        // Suelta el mouse para poder usar el botón "Volver a jugar".
        input.unlock();
        overlay.showDaySummary(stats.summary({ arrivalMinutes: gameState.clockMinutes }));
      },
    },
  };

  const context = {
    elapsed: 0,
    textHideAt: null,
    blockedFor: 0,
    permisoCooldownUntil: 0,
  };
  const machine = new StateMachine(states, 'ARRIVING', context);
  context.machine = machine;

  const isExploring = () =>
    machine.currentName === 'ARRIVING' || machine.currentName === 'SEARCHING';

  /**
   * Interacciones que solo muestran un texto (ascensor, bedelía, directorio). La primera
   * vez suman estrés (evento de stats con el mismo nombre).
   */
  function say(key, seconds = 3.5) {
    return () => {
      if (!isExploring()) return;
      showTimedText(context, facultad.textos[key], seconds);
      stats.trigger(key, { once: true });
    };
  }

  return {
    machine,
    isExploring,
    callElevator: say('ascensor'),
    askBedelia: say('bedelia'),
    readDirectory: say('directorio', 5),
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
