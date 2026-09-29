import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Gestiona el audio de la aplicación sobre THREE.AudioListener / Web Audio API.
 * Los sonidos se generan proceduralmente con osciladores para no depender de archivos,
 * pero cada "voz" está aislada en su propio método para poder reemplazarla más adelante
 * por un THREE.Audio con buffer cargado desde public/assets/sounds/.
 */
export class AudioManager {
  constructor(camera) {
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    this.context = this.listener.context;

    this._activeVoices = new Map();
  }

  /** Debe llamarse tras un gesto del usuario (click en "Comenzar") por las políticas de autoplay. */
  async unlock() {
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /** Alarma del despertador: onda cuadrada intermitente, típica de un reloj digital. */
  playAlarm() {
    this._stopVoice('alarm');
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 1500;
    osc.connect(gain);
    osc.start();

    // Envolvente en pulsos para simular el "beep-beep" de un despertador.
    const now = ctx.currentTime;
    const pulseDuration = 0.18;
    const period = 0.42;
    for (let i = 0; i < 200; i += 1) {
      const t = now + i * period;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(config.audio.volumenAlarma, t + 0.01);
      gain.gain.linearRampToValueAtTime(0, t + pulseDuration);
    }

    this._activeVoices.set('alarm', { osc, gain });
  }

  stopAlarm() {
    this._stopVoice('alarm');
  }

  /** Latido de corazón: dos golpes graves (lub-dub) que se repiten, con ritmo creciente. */
  playHeartbeat() {
    this._stopVoice('heartbeat');
    const ctx = this.context;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60;
    osc.connect(gain);
    osc.start();

    const now = ctx.currentTime;
    let t = now;
    for (let i = 0; i < 60; i += 1) {
      const intervalo = Math.max(0.45, 0.85 - i * 0.01); // se acelera con el tiempo
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(config.audio.volumenLatido, t + 0.03);
      gain.gain.linearRampToValueAtTime(0, t + 0.12);
      gain.gain.setValueAtTime(0, t + 0.18);
      gain.gain.linearRampToValueAtTime(config.audio.volumenLatido * 0.7, t + 0.21);
      gain.gain.linearRampToValueAtTime(0, t + 0.3);
      t += intervalo;
    }

    this._activeVoices.set('heartbeat', { osc, gain });
  }

  stopHeartbeat() {
    this._stopVoice('heartbeat');
  }

  /** Ambiente de fondo suave (ruido de habitación silenciosa). */
  playAmbient() {
    this._stopVoice('ambient');
    const ctx = this.context;
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.05; // ruido blanco muy tenue
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = config.audio.volumenAmbiente;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this._activeVoices.set('ambient', { osc: noise, gain });
  }

  stopAmbient() {
    this._stopVoice('ambient');
  }

  /**
   * Lluvia: ruido filtrado, constante durante toda la escena. Adentro se escucha a
   * través de la ventana cerrada (sin graves ni agudos extremos); afuera, con
   * `exterior: true`, es más fuerte y con más agudos.
   */
  playRain({ exterior = false } = {}) {
    this._stopVoice('rain');
    const ctx = this.context;

    const noise = ctx.createBufferSource();
    noise.buffer = this._getNoiseBuffer();
    noise.loop = true;

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = exterior ? 300 : 500;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = exterior ? 7500 : 4000;

    const gain = ctx.createGain();
    gain.gain.value = exterior ? config.audio.volumenLluviaExterior : config.audio.volumenLluvia;

    noise.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    this._activeVoices.set('rain', { osc: noise, gain });
  }

  stopRain() {
    this._stopVoice('rain');
  }

  /** Celular vibrando: dos zumbidos cortos. */
  playVibration() {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 160;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    for (const start of [0, 0.45]) {
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(config.audio.volumenVibracion, now + start + 0.02);
      gain.gain.setValueAtTime(config.audio.volumenVibracion, now + start + 0.3);
      gain.gain.linearRampToValueAtTime(0, now + start + 0.33);
    }
    this._playOneShot(osc, gain, 0.9);
  }

  /** Pisar un charco: chapoteo (ruido que decae rápido) más un golpe grave. */
  playSplash() {
    const ctx = this.context;
    const now = ctx.currentTime;
    const volume = config.audio.volumenSalpicadura * (0.8 + Math.random() * 0.4);

    const noise = ctx.createBufferSource();
    noise.buffer = this._getNoiseBuffer();
    noise.playbackRate.value = 0.8 + Math.random() * 0.4;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1100 + Math.random() * 500;
    band.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(volume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    this._playOneShot(noise, noiseGain, 0.4, Math.random());

    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(110, now);
    thump.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    const thumpGain = ctx.createGain();
    thumpGain.gain.setValueAtTime(volume * 0.6, now);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    this._playOneShot(thump, thumpGain, 0.15);
  }

  /** Frenos de aire del colectivo y la puerta abriéndose: siseo agudo que se apaga. */
  playBrakeHiss() {
    const ctx = this.context;
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this._getNoiseBuffer();
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 2500;
    const gain = ctx.createGain();
    const volume = config.audio.volumenColectivo * 0.35;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    noise.connect(highpass);
    highpass.connect(gain);
    gain.connect(ctx.destination);
    this._playOneShot(noise, gain, 1.4);
  }

  /**
   * Sonido continuo de un vehículo (motor + neumáticos sobre agua) como audio
   * posicional: hay que agregar `audio` al objeto del vehículo para que se escuche
   * desde ahí y se acerque/aleje con él. `stop()` lo corta y lo desconecta.
   */
  createVehicleSound(kind = 'car') {
    const ctx = this.context;
    const isBus = kind === 'bus';

    const noise = ctx.createBufferSource();
    noise.buffer = this._getNoiseBuffer();
    noise.loop = true;
    const hiss = ctx.createBiquadFilter();
    hiss.type = 'bandpass';
    hiss.frequency.value = isBus ? 800 : 1300;
    hiss.Q.value = 0.6;
    const hissGain = ctx.createGain();
    hissGain.gain.value = isBus ? 0.5 : 0.7;

    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = isBus ? 42 : 70 + Math.random() * 15;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = isBus ? 180 : 240;
    const engineGain = ctx.createGain();
    engineGain.gain.value = isBus ? 0.9 : 0.35;

    const mix = ctx.createGain();
    noise.connect(hiss);
    hiss.connect(hissGain);
    hissGain.connect(mix);
    engine.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(mix);

    const audio = new THREE.PositionalAudio(this.listener);
    audio.setNodeSource(mix);
    audio.setVolume(isBus ? config.audio.volumenColectivo : config.audio.volumenAutos);
    audio.setRefDistance(isBus ? 7 : 5);
    audio.setRolloffFactor(1.4);
    noise.start();
    engine.start();

    let stopped = false;
    return {
      audio,
      /** 0..1: baja el ruido de neumáticos cuando el vehículo está detenido. */
      setRolling(amount) {
        hissGain.gain.value = (isBus ? 0.5 : 0.7) * amount;
      },
      stop() {
        if (stopped) return;
        stopped = true;
        noise.stop();
        engine.stop();
        audio.disconnect();
        audio.removeFromParent();
      },
    };
  }

  /** Ruido blanco de 2 s, generado una vez y reutilizado por todas las voces. */
  _getNoiseBuffer() {
    if (!this._noiseBuffer) {
      const ctx = this.context;
      const size = 2 * ctx.sampleRate;
      this._noiseBuffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = this._noiseBuffer.getChannelData(0);
      for (let i = 0; i < size; i += 1) data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    return this._noiseBuffer;
  }

  /** Reproduce una fuente que se corta sola a los `duration` segundos y se desconecta. */
  _playOneShot(source, output, duration, offset = 0) {
    source.start(this.context.currentTime, offset);
    source.stop(this.context.currentTime + duration);
    source.onended = () => {
      source.disconnect();
      output.disconnect();
    };
  }

  stopAll() {
    for (const key of Array.from(this._activeVoices.keys())) {
      this._stopVoice(key);
    }
  }

  _stopVoice(key) {
    const voice = this._activeVoices.get(key);
    if (!voice) return;
    try {
      voice.osc.stop();
    } catch {
      // ya estaba detenido
    }
    voice.osc.disconnect();
    voice.gain.disconnect();
    this._activeVoices.delete(key);
  }

  dispose() {
    this.stopAll();
  }
}
