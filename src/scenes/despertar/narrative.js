import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPlayerMovement } from '../../systems/PlayerMovement.js';
import { config } from '../../config.js';
import { buildPoses } from '../bedroom/narrative.js';
import { diplomaSpot } from './diploma.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const smoothstep = (t) => t * t * (3 - 2 * t);

/** El ángulo equivalente a `to` más cercano a `from` (para girar por el camino corto). */
function shortestAngle(from, to) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/** Cámara a 1,15 m del título, de frente: desde ahí se lee entero. */
const readingPose = {
  position: new THREE.Vector3(diplomaSpot.x - 1.15, 1.55, diplomaSpot.z),
  yaw: -Math.PI / 2, // mira hacia +X, a la pared este
  pitch: 0,
};

/**
 * Narrativa de la última escena, el despertar: el estudiante abre los ojos de golpe en su
 * cama, con las cortinas cerradas, y se da cuenta de que el parcial fue una pesadilla. Un
 * haz de sol se cuela entre las cortinas y ilumina la pared donde cuelga su título de
 * Ingeniero en Sistemas de Información. Lo mira de cerca y la escena (y el juego) termina.
 */
export function createDespertarNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  collision,
  beam,
}) {
  const cfg = config.despertar;
  const poses = buildPoses();
  const movement = createPlayerMovement({ camera, input, collision });

  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _pose = { position: new THREE.Vector3(), yaw: 0, pitch: 0 };

  function applyPose(pose) {
    camera.position.copy(pose.position);
    _euler.set(pose.pitch, pose.yaw, 0);
    camera.quaternion.setFromEuler(_euler);
  }

  function lerpPoseInto(a, b, t) {
    _pose.position.lerpVectors(a.position, b.position, t);
    _pose.yaw = lerp(a.yaw, shortestAngle(a.yaw, b.yaw), t);
    _pose.pitch = lerp(a.pitch, b.pitch, t);
    return _pose;
  }

  /** Pose actual de la cámara, para salir de donde esté parado. */
  function currentPose() {
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    return { position: camera.position.clone(), yaw: euler.y, pitch: euler.x };
  }

  function showTimedText(ctx, text, seconds) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
  }

  const states = {
    // Negro y silencio: todavía dentro de la pesadilla.
    SLEEPING: {
      onEnter(ctx) {
        ctx.timer = 0;
        overlay.hideFadeToBlack();
        overlay.setStatsVisible(false);
        overlay.setObjective(null);
        overlay.setEyelidIntensity(1);
        overlay.setVignetteIntensity(0);
        input.setLookEnabled(false);
        applyPose(poses.lying);
        beam.setStrength(0);
        // Todavía dentro de la pesadilla: el corazón a mil.
        audio.playHeartbeat();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (ctx.timer >= cfg.segundosDormido) ctx.machine.transition('WAKING');
      },
    },

    // Abre los ojos de golpe y se sienta en la cama, agitado. Mientras tanto se calma.
    WAKING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.textIndex = 0;
        ctx.calm = {
          estres: stats.get('estres') / cfg.segundosCalma,
          mojado: stats.get('mojado') / cfg.segundosCalma,
        };
        audio.stopHeartbeat();
        audio.playGasp(); // despierta de golpe
        audio.playAmbient();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const t = ctx.timer;

        // Párpados: se abren de golpe y vuelven a cerrarse en un parpadeo.
        const open = 1 - easeOutCubic(clamp01(t / 0.45));
        const blink = Math.max(0, 1 - Math.abs(t - 1.1) / 0.14) * 0.85;
        overlay.setEyelidIntensity(Math.max(open, blink));
        overlay.setVignetteIntensity(0.5 * (1 - smoothstep(clamp01(t / 4))));

        const sit = easeOutCubic(clamp01(t / cfg.segundosSobresalto));
        applyPose(lerpPoseInto(poses.lying, poses.sitting, sit));

        const next = cfg.textos[ctx.textIndex];
        if (next && t >= next.en) {
          showTimedText(ctx, next.texto, next.segundos);
          if (next.sonido === 'suspiro') audio.playSigh(); // el alivio de saber que fue un sueño
          ctx.textIndex += 1;
        }

        const last = cfg.textos[cfg.textos.length - 1];
        if (t >= last.en + last.segundos + 0.8) ctx.machine.transition('GETTING_UP');
      },
    },

    GETTING_UP: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.from = currentPose();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const t = clamp01(ctx.timer / config.gettingUp.duracionSegundos);
        applyPose(lerpPoseInto(ctx.from, poses.standing, easeInOutCubic(t)));
        if (t >= 1) ctx.machine.transition('EXPLORING');
      },
    },

    EXPLORING: {
      onEnter() {
        overlay.setEyelidIntensity(0);
        overlay.setCrosshairVisible(true);
        overlay.setObjective(cfg.objetivo);
        input.setLookEnabled(true);
      },
      onUpdate(delta) {
        movement.update(delta);
        interaction.update(delta * 1000);
        if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
        else overlay.hideHint();
      },
      onExit() {
        overlay.hideHint();
        overlay.setCrosshairVisible(false);
        overlay.setObjective(null);
      },
    },

    // La cámara se acerca al título y se lo lee entero, con calma.
    LOOKING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.from = currentPose();
        ctx.startFov = camera.fov;
        ctx.titleShown = false;
        ctx.closingShown = false;
        input.setLookEnabled(false);
        overlay.hideNarrativeText();
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        const glide = easeInOutCubic(clamp01(ctx.timer / 2.4));
        applyPose(lerpPoseInto(ctx.from, readingPose, glide));
        camera.fov = lerp(ctx.startFov, cfg.zoomFov, glide);
        camera.updateProjectionMatrix();

        if (!ctx.titleShown && ctx.timer >= 2.2) {
          ctx.titleShown = true;
          overlay.showNarrativeText(cfg.textoTitulo);
          audio.playChimes();
          audio.setMorningPadLevel(1.8, 3);
        }
        if (!ctx.closingShown && ctx.timer >= 2.2 + cfg.segundosMirandoTitulo * 0.5) {
          ctx.closingShown = true;
          overlay.showNarrativeText(cfg.textoCierre);
        }
        if (ctx.timer >= 2.2 + cfg.segundosMirandoTitulo) ctx.machine.transition('ENDING');
      },
    },

    ENDING: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.restartShown = false;
        overlay.hideNarrativeText();
        overlay.showFadeToBlack(cfg.textoFinal);
        audio.setMorningPadLevel(0, 4);
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.restartShown && ctx.timer >= 3.4) {
          ctx.restartShown = true;
          // Suelta el mouse para poder apretar "Volver a jugar".
          input.unlock();
          overlay.showRestartButton();
        }
      },
    },
  };

  const context = { elapsed: 0, textHideAt: null, sunTime: 0, padStarted: false, nextBirdAt: 3 };
  const machine = new StateMachine(states, 'SLEEPING', context);
  context.machine = machine;

  return {
    machine,
    canLook: () => machine.currentName === 'EXPLORING',
    lookAtDiploma() {
      if (machine.currentName === 'EXPLORING') machine.transition('LOOKING');
    },
    /** E o click: mirar el título si se apunta a él. */
    interact() {
      if (machine.currentName === 'EXPLORING') interaction.triggerInteract();
    },
    update(delta) {
      const ctx = context;
      ctx.elapsed += delta;
      const state = machine.currentName;

      if (state !== 'SLEEPING') {
        // El sol sale de entre las nubes apenas abre los ojos, y los nervios bajan solos.
        ctx.sunTime += delta;
        beam.setStrength(smoothstep(clamp01((ctx.sunTime - 1.2) / cfg.luz.aparecerSegundos)));
        // Con la luz llega la calma: un acorde cálido y, de a ratos, un pájaro afuera.
        if (!ctx.padStarted && ctx.sunTime >= 1.2) {
          ctx.padStarted = true;
          audio.playMorningPad();
        }
        if (state !== 'ENDING' && ctx.sunTime >= ctx.nextBirdAt) {
          audio.playBird();
          ctx.nextBirdAt = ctx.sunTime + 2.5 + Math.random() * 4;
        }
        if (ctx.calm) {
          stats.drift('estres', -ctx.calm.estres, delta);
          stats.drift('mojado', -ctx.calm.mojado, delta);
        }
      }

      if (ctx.textHideAt !== null && ctx.elapsed >= ctx.textHideAt) {
        overlay.hideNarrativeText();
        ctx.textHideAt = null;
      }
      machine.update(delta);
    },
  };
}
