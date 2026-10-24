import * as THREE from 'three';
import { StateMachine } from '../../systems/StateMachine.js';
import { createPhoneClock, parseTime } from '../../systems/PhoneClock.js';
import { gameState } from '../../core/gameState.js';
import { config } from '../../config.js';
import { playerEye, handInSpot } from './layout.js';

/**
 * Narrativa de la escena 5, el parcial: sentado en el banco, se lee el parcial con E
 * (cuanto más estrés, más borroso se ve). Durante el examen el viento vuela hojas, se cae
 * la lapicera, la profesora pasa mirando y avisa cuánto falta. Cuando se termina el
 * tiempo viene al banco a retirar el parcial: se entrega con E y termina la escena.
 */
export function createExamNarrative({
  camera,
  overlay,
  audio,
  input,
  stats,
  interaction,
  desk,
  professor,
  classroom,
}) {
  const cfg = config.parcial;
  const start = gameState.clockMinutes ?? parseTime(cfg.horaInicio);
  const end = Math.max(parseTime(cfg.horaEntrega), start + cfg.minutosMinimos);

  // La hora y el celular siguen como quedaron en la facultad.
  const phone = createPhoneClock({
    overlay,
    audio,
    startMinutes: start,
    received: gameState.phoneNotifications ?? [
      ...config.parada.notificacionesPrevias,
      ...config.parada.notificaciones,
      ...config.viaje.notificaciones,
      ...config.facultad.notificaciones,
    ],
    incoming: cfg.notificaciones,
    secondsPerMinute: cfg.segundosPorMinuto,
    battery: config.parada.bateriaCelular,
    onReceive: (item) => stats.message(item.de),
  });

  const atProgress = (fraction) => start + (end - start) * fraction;
  const isSitting = () => ['SEATED', 'READING'].includes(machine.currentName);
  const eyeXZ = new THREE.Vector2(playerEye.x, playerEye.z);

  function showTimedText(ctx, text, seconds = 3.5) {
    overlay.showNarrativeText(text);
    ctx.textHideAt = ctx.elapsed + seconds;
  }

  /**
   * Objetivo según el estado. `state` se pasa explícito desde los onEnter: el primero
   * corre dentro del constructor de la máquina, cuando todavía no existe `machine`.
   */
  function updateObjective(state = context.machine.currentName) {
    if (state === 'TIME_UP') {
      overlay.setObjective(
        context.canHandIn
          ? 'Entregá el parcial [E]'
          : 'Se terminó el tiempo · esperá a la profesora',
      );
      return;
    }
    if (state !== 'SEATED' && state !== 'READING') return;
    if (desk.pagesOnDesk().length === 0) {
      overlay.setObjective('Se volaron las hojas: levantalas del piso [E]');
    } else if (desk.sheetsMissing > 0) {
      overlay.setObjective('Se volaron hojas: levantalas del piso [E] · [R] celular');
    } else {
      overlay.setObjective(`Leé el parcial [E] · entrega ${cfg.horaEntrega} hs`);
    }
  }

  /** Mira, pasa el mouse por las cosas y muestra qué se puede hacer con E. */
  function look(delta) {
    interaction.update(delta * 1000);
    if (interaction.hovered) overlay.showHint(`[E] ${interaction.hovered.label}`);
    else if (machine.currentName === 'SEATED' && desk.pagesOnDesk().length > 0) {
      overlay.showHint('[E] Leer el parcial');
    } else overlay.hideHint();
  }

  // ---------- Lo que pasa durante el parcial ----------
  function gust(hojas) {
    audio.playWind();
    if (machine.currentName === 'READING') machine.transition('SEATED');
    const blown = desk.blowAway(hojas);
    if (blown > 0) {
      audio.playPaper();
      stats.trigger('rafaga');
      showTimedText(context, cfg.textos.rafaga, 3);
    }
    updateObjective();
  }

  function penFalls() {
    if (!desk.dropPen()) return;
    stats.trigger('lapiceraCaida');
    if (machine.currentName !== 'READING') showTimedText(context, cfg.textos.lapicera, 3);
  }

  const schedule = [
    ...cfg.rafagas.map(({ en, hojas }) => ({ at: atProgress(en), run: () => gust(hojas) })),
    { at: atProgress(cfg.lapiceraEn), run: penFalls },
    ...cfg.avisos.map(({ faltan, texto, evento }) => ({
      at: end - faltan,
      run: () => {
        stats.trigger(evento);
        showTimedText(context, texto, 3.5);
      },
    })),
  ]
    .filter((event) => event.at > start)
    .sort((a, b) => a.at - b.at);

  /** La profesora pasa cerca (te mira) o te ve con el celular. */
  function watchProfessor(ctx) {
    const { distanciaMira, distanciaCelular } = cfg.profesora;
    const distance = eyeXZ.distanceTo(
      new THREE.Vector2(professor.position.x, professor.position.z),
    );
    if (distance < distanciaMira && ctx.elapsed > ctx.watchCooldownUntil) {
      ctx.watchCooldownUntil = ctx.elapsed + 30;
      stats.trigger('profeMira');
    }
    if (
      overlay.isPhoneVisible &&
      distance < distanciaCelular &&
      ctx.elapsed > ctx.phoneCooldownUntil
    ) {
      ctx.phoneCooldownUntil = ctx.elapsed + 12;
      stats.trigger('celularEnParcial');
      overlay.setPhoneVisible(false);
      showTimedText(ctx, cfg.textos.celular, 3);
    }
  }

  /** Cuánto se desenfoca el parcial: con el estrés, atenuado por lo que se repasó. */
  function blurFor(time) {
    const { desde, maximoPx, atenuaPreparacion } = cfg.desenfoque;
    const stress = Math.max(0, (stats.get('estres') - desde) / (100 - desde));
    const prepared = 1 - atenuaPreparacion * (stats.get('preparacion') / 100);
    // La vista "busca foco": el desenfoque late un poco.
    return maximoPx * stress * prepared * (1 + 0.18 * Math.sin(time * 2.3));
  }

  const states = {
    SEATED: {
      onEnter(ctx) {
        if (!ctx.seatedOnce) {
          ctx.seatedOnce = true;
          camera.position.set(playerEye.x, playerEye.y, playerEye.z);
          camera.quaternion.setFromEuler(new THREE.Euler(playerEye.pitch, playerEye.yaw, 0, 'YXZ'));
          camera.fov = config.player.fov;
          camera.updateProjectionMatrix();
          overlay.hideFadeToBlack();
          showTimedText(ctx, cfg.textos.inicio, 3.5);
        }
        overlay.setCrosshairVisible(true);
        input.setLookEnabled(true);
        updateObjective('SEATED');
      },
      onUpdate(delta) {
        look(delta);
      },
      onExit() {
        overlay.hideHint();
      },
    },

    READING: {
      onEnter() {
        input.setLookEnabled(false);
        overlay.setCrosshairVisible(false);
        overlay.setPhoneVisible(false);
        overlay.openNotes(desk.pagesOnDesk());
      },
      onUpdate(delta, ctx) {
        overlay.setNotesBlur(blurFor(ctx.elapsed));
      },
      onExit() {
        overlay.closeNotes();
      },
    },

    // Se terminó el tiempo: la profesora viene al banco a retirar el parcial.
    TIME_UP: {
      onEnter(ctx) {
        ctx.canHandIn = false;
        overlay.setCrosshairVisible(true);
        input.setLookEnabled(true);
        showTimedText(ctx, cfg.textos.fin, 4.5);
        stats.trigger('noLlegaste');
        professor.goTo(handInSpot.x, handInSpot.z, Math.PI, () => {
          ctx.canHandIn = true;
          // Si no se lo das, te lo saca ella.
          ctx.handInDeadline = ctx.elapsed + 10;
          updateObjective('TIME_UP');
        });
        updateObjective('TIME_UP');
      },
      onUpdate(delta, ctx) {
        look(delta);
        if (ctx.canHandIn && ctx.elapsed > ctx.handInDeadline) machine.transition('HANDING_IN');
      },
      onExit() {
        overlay.hideHint();
      },
    },

    HANDING_IN: {
      onEnter(ctx) {
        ctx.timer = 0;
        ctx.faded = false;
        ctx.missing = desk.sheetsMissing;
        input.setLookEnabled(false);
        overlay.setPhoneVisible(false);
        overlay.setCrosshairVisible(false);
        overlay.setObjective(null);
        if (ctx.missing > 0) {
          stats.trigger('entregaIncompleta');
          showTimedText(ctx, cfg.textos.faltanHojas, 2.5);
        } else {
          showTimedText(ctx, cfg.textos.entrega, 2.5);
        }
        audio.playPaper();
        desk.handIn(professor.handPosition());
        gameState.clockMinutes = phone.minutes;
        gameState.phoneNotifications = phone.notifications;
      },
      onUpdate(delta, ctx) {
        ctx.timer += delta;
        if (!ctx.faded && ctx.timer >= 2.6) {
          ctx.faded = true;
          overlay.showFadeToBlack(cfg.textoFinal, stats.sceneDeltas());
        }
        if (ctx.timer >= 5.2) machine.transition('END');
      },
    },

    END: {
      onEnter(ctx) {
        audio.stopAll();
        // Suelta el mouse para poder usar el botón "Volver a jugar".
        input.unlock();
        overlay.showDaySummary(
          stats.summary({
            arrivalMinutes: gameState.arrivalMinutes ?? start,
            penalty: ctx.missing * 15,
          }),
        );
      },
    },
  };

  const context = {
    elapsed: 0,
    textHideAt: null,
    watchCooldownUntil: 0,
    phoneCooldownUntil: 0,
    lastClockMinute: -1,
    canHandIn: false,
    missing: 0,
  };
  const machine = new StateMachine(states, 'SEATED', context);
  context.machine = machine;

  function openExam() {
    if (machine.currentName !== 'SEATED') return;
    if (desk.pagesOnDesk().length === 0) {
      showTimedText(context, cfg.textos.sinHojas, 3);
      return;
    }
    machine.transition('READING');
  }

  function closeExam() {
    if (machine.currentName === 'READING') machine.transition('SEATED');
  }

  return {
    machine,
    canRead: () => machine.currentName === 'SEATED' && desk.pagesOnDesk().length > 0,
    canPickUp: () => machine.currentName === 'SEATED' || machine.currentName === 'TIME_UP',
    pickUpSheet(sheet) {
      if (desk.pickUpSheet(sheet)) {
        stats.trigger('hojaLevantada');
        // El objetivo se actualiza cuando la hoja termina de volver al banco.
        setTimeout(updateObjective, 600);
      }
    },
    pickUpPen() {
      desk.pickUpPen();
    },
    openExam,
    /** E o click: levantar lo que se mira, abrir/cerrar el parcial o entregarlo. */
    interact() {
      const state = machine.currentName;
      if (state === 'READING') {
        closeExam();
      } else if (state === 'SEATED') {
        if (interaction.hovered) interaction.triggerInteract();
        else openExam();
      } else if (state === 'TIME_UP') {
        if (interaction.hovered) interaction.triggerInteract();
        else if (context.canHandIn) machine.transition('HANDING_IN');
      }
    },
    togglePhone() {
      const state = machine.currentName;
      if (state === 'SEATED' || state === 'TIME_UP') {
        overlay.setPhoneVisible(!overlay.isPhoneVisible);
      }
    },
    /** Teclas del visor: flechas (o A/D) para pasar de hoja, + y − para zoom, Esc/Q para cerrar. */
    handleKey(code, key) {
      if (machine.currentName !== 'READING') return;
      if (code === 'ArrowRight' || code === 'KeyD') overlay.showNextNote();
      else if (code === 'ArrowLeft' || code === 'KeyA') overlay.showPrevNote();
      else if (key === '+' || key === '=' || code === 'NumpadAdd') overlay.zoomNote(1);
      else if (key === '-' || code === 'NumpadSubtract') overlay.zoomNote(-1);
      else if (code === 'Escape' || code === 'KeyQ') closeExam();
    },
    handleWheel(deltaY) {
      if (machine.currentName === 'READING' && deltaY !== 0) overlay.zoomNote(-deltaY);
    },
    handlePointerMove(dx, dy) {
      if (machine.currentName === 'READING') overlay.panNote(dx, dy);
    },
    handleLockChange(locked) {
      if (!locked) closeExam();
    },
    update(delta) {
      const ctx = context;
      ctx.elapsed += delta;
      const state = machine.currentName;
      if (state !== 'HANDING_IN' && state !== 'END') phone.update(delta);
      const minutes = phone.minutes;

      // Reloj de pared: se redibuja una vez por minuto.
      const minute = Math.floor(minutes);
      if (minute !== ctx.lastClockMinute) {
        ctx.lastClockMinute = minute;
        classroom.clock.setTime(minute);
      }

      if (isSitting()) {
        while (schedule.length > 0 && schedule[0].at <= minutes) schedule.shift().run();
        // Los nervios suben solos, más hacia el final.
        const progress = Math.min(1, (minutes - start) / (end - start));
        stats.drift('estres', cfg.estresPorSegundo * (0.5 + progress), delta);
        stats.drift('mojado', -config.stats.secadoPorSegundo, delta);
        watchProfessor(ctx);
        if (minutes >= end) {
          if (machine.currentName === 'READING') machine.transition('SEATED');
          machine.transition('TIME_UP');
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
