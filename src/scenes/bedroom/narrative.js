import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { config } from '../../config.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { furniture } from './roomLayout.js';

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;

/** Poses de cámara (posición + yaw/pitch) que recorre la animación de despertarse y levantarse. */
function buildPoses() {
  const { bed } = furniture;
  const headZ = bed.center.z - bed.length / 2;
  const bedTopY = bed.frameHeight + bed.mattressHeight;

  const lying = {
    position: new THREE.Vector3(bed.center.x, bedTopY + 0.14, headZ + 0.5),
    yaw: 0.15,
    pitch: Math.PI / 2 - 0.05, // casi derecho hacia el techo
  };
  const sitting = {
    position: new THREE.Vector3(
      bed.center.x + bed.width / 2 - 0.2,
      bed.frameHeight + 0.42,
      bed.center.z,
    ),
    yaw: -Math.PI * 0.42,
    pitch: 0.08,
  };
  const standing = {
    position: new THREE.Vector3(
      // Fuera del obstáculo de la cama (borde + radio de colisión + margen): si el
      // jugador quedara encimado, cualquier paso chocaría y no podría caminar.
      bed.center.x + bed.width / 2 + config.player.radioColision + 0.1,
      config.player.alturaOjos,
      sitting.position.z + 0.2,
    ),
    yaw: -Math.PI * 0.42,
    pitch: 0,
  };

  return { lying, sitting, standing };
}

/**
 * Crea la narrativa de la escena de la habitación: la máquina de estados y toda
 * la lógica de alto nivel (animación de cámara, audio, overlay) que dispara.
 * No conoce el loop de render de Three.js más allá de la cámara que se le pasa.
 */
export function createNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  collision,
  notesPages,
  onLeave,
}) {
  const poses = buildPoses();
  const movement = createPlayerMovement({ camera, input, collision });

  // Reutilizamos estos objetos en cada frame para no asignar memoria en el loop.
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _pose = { position: new THREE.Vector3(), yaw: 0, pitch: 0 };

  function applyPose(pose) {
    camera.position.copy(pose.position);
    _euler.set(pose.pitch, pose.yaw, 0);
    camera.quaternion.setFromEuler(_euler);
  }

  function lerpPoseInto(a, b, t) {
    _pose.position.lerpVectors(a.position, b.position, t);
    _pose.yaw = lerp(a.yaw, b.yaw, t);
    _pose.pitch = lerp(a.pitch, b.pitch, t);
    return _pose;
  }

  const states = {
    SLEEPING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.hasStood = false;
        ctx.realized = false;
        ctx.pagesRead = new Set();
        // Empieza el día: los stats vuelven a cero y el HUD espera a que se levante.
        stats.reset();
        overlay.setStatsVisible(false);
        overlay.setObjective(null);
        overlay.setEyelidIntensity(1);
        overlay.setVignetteIntensity(0);
        // Todavía dormido: el mouse no responde hasta terminar de levantarse.
        input.setLookEnabled(false);
        applyPose(poses.lying);
        audio.playAlarm();
        audio.playRain();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (ctx.timer >= config.sleeping.duracionSegundos) {
          ctx.machine.transition('WAKING');
        }
      },
    },

    WAKING: {
      onEnter(ctx) {
        ctx.timer = 0;
        audio.stopAlarm();
        applyPose(poses.lying);
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const duracion = config.waking.duracionSegundos;
        const progress = clamp01(ctx.timer / duracion);

        // Fundido de base: de pantalla negra (párpados cerrados) a ojos abiertos del todo.
        const baseFade = 1 - easeOutCubic(progress);

        // Parpadeos superpuestos: picos breves que vuelven a cerrar el párpado,
        // cada vez más espaciados, simulando resistirse a despertar.
        const blinks = config.waking.numeroParpadeos;
        let blinkSpike = 0;
        for (let i = 0; i < blinks; i += 1) {
          const blinkTime = (duracion * 0.75 * (i + 1)) / blinks;
          const distancia = Math.abs(ctx.timer - blinkTime);
          if (distancia < 0.12) {
            blinkSpike = Math.max(blinkSpike, 1 - distancia / 0.12);
          }
        }

        overlay.setEyelidIntensity(Math.min(1, baseFade + blinkSpike * 0.9));
        overlay.setVignetteIntensity(baseFade * 0.4);

        if (progress >= 1) {
          ctx.machine.transition('GETTING_UP');
        }
      },
    },

    GETTING_UP: {
      onEnter(ctx) {
        ctx.timer = 0;
        audio.playAmbient();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const duracion = config.gettingUp.duracionSegundos;
        const t = clamp01(ctx.timer / duracion);

        let pose;
        if (t < 0.6) {
          const local = easeInOutCubic(t / 0.6);
          pose = lerpPoseInto(poses.lying, poses.sitting, local);
        } else {
          const local = easeInOutCubic((t - 0.6) / 0.4);
          pose = lerpPoseInto(poses.sitting, poses.standing, local);
        }
        applyPose(pose);

        if (t >= 1) {
          ctx.machine.transition('EXPLORING');
        }
      },
    },

    EXPLORING: {
      onEnter(ctx) {
        overlay.setEyelidIntensity(0);
        overlay.setVignetteIntensity(0);
        overlay.setCrosshairVisible(true);
        overlay.setStatsVisible(true);
        // Solo la primera vez (al terminar de levantarse): al volver de leer los
        // apuntes o de darse cuenta de la hora, el jugador sigue donde estaba.
        if (!ctx.hasStood) {
          applyPose(poses.standing);
          ctx.hasStood = true;
        }
        input.setLookEnabled(true);
      },
      onUpdate(delta) {
        movement.update(delta);
        interaction.update(delta * 1000);
        if (interaction.hovered) {
          overlay.showHint(`[E] ${interaction.hovered.label}`);
        } else {
          overlay.hideHint();
        }
      },
      onExit() {
        overlay.hideHint();
        overlay.setCrosshairVisible(false);
      },
    },

    READING: {
      onEnter(ctx) {
        // La cámara queda quieta mientras se leen los apuntes; el movimiento
        // tampoco corre porque solo se aplica en EXPLORING.
        input.setLookEnabled(false);
        overlay.openNotes(notesPages);
        ctx.pageIndex = overlay.currentNoteIndex;
        ctx.pageTime = 0;
      },
      // Cada hoja mirada un rato cuenta como repasada (una vez): suma preparación. Antes
      // de saber la hora repasar tranquiliza; después, se repasa a las apuradas.
      onUpdate(delta, ctx) {
        const index = overlay.currentNoteIndex;
        if (index !== ctx.pageIndex) {
          ctx.pageIndex = index;
          ctx.pageTime = 0;
        }
        ctx.pageTime += delta;
        if (ctx.pageTime >= config.stats.segundosPorHoja && !ctx.pagesRead.has(index)) {
          ctx.pagesRead.add(index);
          stats.trigger(ctx.realized ? 'hojaApurado' : 'hojaTranquilo');
        }
      },
      onExit() {
        overlay.closeNotes();
      },
    },

    REALIZATION: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.textShown = false;
        ctx.notifsShown = false;
        ctx.startFov = camera.fov;
        audio.stopAmbient();
        audio.playHeartbeat();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const volver = config.realization.volverAExplorarSegundos;

        // Zoom de "caer en la cuenta" al principio y vuelta al FOV normal al final.
        const zoomIn = easeOutCubic(clamp01(ctx.timer / 1.5));
        const zoomOut = easeInOutCubic(clamp01((ctx.timer - (volver - 0.8)) / 0.8));
        const zoomedFov = lerp(ctx.startFov, config.realization.zoomFov, zoomIn);
        camera.fov = lerp(zoomedFov, config.player.fov, zoomOut);
        camera.updateProjectionMatrix();

        if (!ctx.textShown && ctx.timer >= config.realization.textoDelaySegundos) {
          ctx.textShown = true;
          overlay.showNarrativeText(
            `Son las ${config.narrative.horaDespertar}. El parcial es a las ${config.narrative.horaParcial}.`,
          );
          stats.trigger('dormido');
        }
        if (!ctx.notifsShown && ctx.timer >= config.realization.notificacionesDelaySegundos) {
          ctx.notifsShown = true;
          overlay.showNotifications(config.narrative.notificaciones);
          stats.trigger('mensajesSinLeer');
        }
        if (ctx.timer >= volver) {
          ctx.machine.transition('EXPLORING');
        }
      },
      onExit(ctx) {
        ctx.realized = true;
        camera.fov = config.player.fov;
        camera.updateProjectionMatrix();
        overlay.hideNarrativeText();
        overlay.clearNotifications();
        overlay.setObjective('¡Llegás tarde! Salí por la puerta');
      },
    },

    // Fundido a negro y pase a la parada del colectivo.
    LEAVING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.left = false;
        input.setLookEnabled(false);
        overlay.setObjective(null);
        overlay.showFadeToBlack(config.salida.textoFundido, stats.sceneDeltas());
        audio.stopHeartbeat();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.left && ctx.timer >= config.salida.duracionFundidoSegundos) {
          ctx.left = true;
          onLeave();
        }
      },
    },
  };

  const context = {};
  const machine = new StateMachine(states, 'SLEEPING', context);
  context.machine = machine;

  /** Llamado por la escena cuando el jugador interactúa con el despertador o el celular. */
  function requestRealization() {
    if (machine.currentName === 'EXPLORING' && !context.realized) {
      machine.transition('REALIZATION');
    }
  }

  /** Llamado por la escena cuando el jugador usa la puerta (solo después de darse cuenta). */
  function leaveRoom() {
    if (machine.currentName === 'EXPLORING' && context.realized) {
      machine.transition('LEAVING');
    }
  }

  function openNotes() {
    if (machine.currentName === 'EXPLORING') machine.transition('READING');
  }

  function closeNotes() {
    if (machine.currentName === 'READING') machine.transition('EXPLORING');
  }

  /**
   * Teclas del visor de apuntes: flechas (o A/D) para pasar de hoja, + y − para
   * zoom, Esc/Q para cerrar.
   */
  function handleKey(code, key) {
    if (machine.currentName !== 'READING') return;
    if (code === 'ArrowRight' || code === 'KeyD') overlay.showNextNote();
    else if (code === 'ArrowLeft' || code === 'KeyA') overlay.showPrevNote();
    else if (key === '+' || key === '=' || code === 'NumpadAdd') overlay.zoomNote(1);
    else if (key === '-' || code === 'NumpadSubtract') overlay.zoomNote(-1);
    else if (code === 'Escape' || code === 'KeyQ') closeNotes();
  }

  function handleWheel(deltaY) {
    if (machine.currentName === 'READING' && deltaY !== 0) overlay.zoomNote(-deltaY);
  }

  function handlePointerMove(dx, dy) {
    if (machine.currentName === 'READING') overlay.panNote(dx, dy);
  }

  return {
    machine,
    requestRealization,
    leaveRoom,
    get hasRealized() {
      return context.realized === true;
    },
    openNotes,
    closeNotes,
    handleKey,
    handleWheel,
    handlePointerMove,
    update(delta) {
      // Desde que sabe la hora, los nervios suben solos (acá no hay reloj corriendo).
      if (context.realized && machine.currentName !== 'LEAVING') {
        stats.addLatenessStress(null, delta);
      }
      machine.update(delta);
    },
  };
}
