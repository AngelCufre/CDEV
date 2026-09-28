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
