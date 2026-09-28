import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { config } from '../../config.js';
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
      sitting.position.x + 0.4,
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
export function createNarrative({ camera, overlay, audio, input, interaction, collision }) {
  const poses = buildPoses();

  // Reutilizamos estos objetos en cada frame para no asignar memoria en el loop.
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _forward = new THREE.Vector3();
  const _right = new THREE.Vector3();
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

  function updateMovement(delta) {
    const move = input.move;
    if (!(move.forward || move.back || move.left || move.right)) return;

    camera.getWorldDirection(_forward);
    _forward.y = 0;
    _forward.normalize();
    _right.set(_forward.z, 0, -_forward.x); // perpendicular en el plano XZ

    let dx = 0;
    let dz = 0;
    const step = config.player.velocidadCaminar * delta;
    if (move.forward) {
      dx += _forward.x * step;
      dz += _forward.z * step;
    }
    if (move.back) {
      dx -= _forward.x * step;
      dz -= _forward.z * step;
    }
    if (move.right) {
      dx += _right.x * step;
      dz += _right.z * step;
    }
    if (move.left) {
      dx -= _right.x * step;
      dz -= _right.z * step;
    }

    collision.resolve(camera.position, dx, dz);
  }

  const states = {
    SLEEPING: {
      onEnter(ctx) {
        ctx.timer = 0;
        overlay.setEyelidIntensity(1);
        overlay.setVignetteIntensity(0);
        applyPose(poses.lying);
        audio.playAlarm();
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
      onEnter() {
        overlay.setEyelidIntensity(0);
        overlay.setVignetteIntensity(0);
        overlay.setCrosshairVisible(true);
        applyPose(poses.standing);
      },
      onUpdate(delta) {
        updateMovement(delta);
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

    REALIZATION: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.textShown = false;
        ctx.notifsShown = false;
        ctx.fadeShown = false;
        ctx.startFov = camera.fov;
        audio.stopAmbient();
        audio.playHeartbeat();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;

        const zoomT = clamp01(ctx.timer / 1.5);
        camera.fov = lerp(ctx.startFov, config.realization.zoomFov, easeOutCubic(zoomT));
        camera.updateProjectionMatrix();

        if (!ctx.textShown && ctx.timer >= config.realization.textoDelaySegundos) {
          ctx.textShown = true;
          overlay.showNarrativeText(
            `Son las ${config.narrative.horaDespertar}. El parcial es a las ${config.narrative.horaParcial}.`,
          );
        }
        if (!ctx.notifsShown && ctx.timer >= config.realization.notificacionesDelaySegundos) {
          ctx.notifsShown = true;
          overlay.showNotifications(config.narrative.notificaciones);
        }
        if (!ctx.fadeShown && ctx.timer >= config.realization.fundidoDelaySegundos) {
          ctx.fadeShown = true;
          audio.stopHeartbeat();
          input.unlock();
          overlay.showFadeToBlack();
        }
        if (ctx.timer >= config.realization.finDeEscenaDelaySegundos) {
          ctx.machine.transition('END');
        }
      },
    },

    END: {
      onEnter() {
        audio.stopAll();
      },
      onUpdate() {
        // Estado terminal: la escena no hace nada más hasta que se reinicie o
        // se cargue la próxima escena del juego completo.
      },
    },
  };

  const context = {};
  const machine = new StateMachine(states, 'SLEEPING', context);
  context.machine = machine;

  /** Llamado por la escena cuando el jugador interactúa con el despertador o el celular. */
  function requestRealization() {
    if (machine.currentName === 'EXPLORING') {
      machine.transition('REALIZATION');
    }
  }

  return {
    machine,
    requestRealization,
    update(delta) {
      machine.update(delta);
    },
  };
}
