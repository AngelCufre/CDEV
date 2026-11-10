import fs from 'node:fs';

// Segunda composicion original: suspenso psicologico y cinematografico.
// Piano escaso, cuerdas graves, pulso creciente y cierre limpio para el titulo.
// No utiliza muestras ni audio del trailer original.

const sampleRate = 48_000;
const duration = Number(process.argv[2] ?? 55.125);
const output = process.argv[3] ?? new URL('./musica-suspenso-v2-original.wav', import.meta.url);
const frameCount = Math.ceil(duration * sampleRate);
const pcm = Buffer.allocUnsafe(frameCount * 4);
const tau = Math.PI * 2;

const smoothstep = (a, b, x) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

const piano = [
  { t: 1.8, f: 146.83, a: 0.34, pan: -0.25 }, // Re
  { t: 5.8, f: 155.56, a: 0.30, pan: 0.22 },  // Mib
  { t: 9.1, f: 110.00, a: 0.32, pan: -0.12 }, // La
  { t: 12.2, f: 130.81, a: 0.30, pan: 0.18 }, // Do
  { t: 15.2, f: 146.83, a: 0.37, pan: -0.20 },
  { t: 20.7, f: 87.31, a: 0.26, pan: 0.18 },  // Fa grave
  { t: 25.0, f: 73.42, a: 0.34, pan: -0.18 }, // Re grave
  { t: 27.5, f: 55.00, a: 0.32, pan: 0.14 },  // La grave
  { t: 32.9, f: 77.78, a: 0.36, pan: 0.20 },  // Mib grave
  { t: 36.1, f: 65.41, a: 0.31, pan: -0.20 }, // Do grave
  { t: 41.25, f: 55.00, a: 0.36, pan: 0.12 },
  { t: 45.0, f: 73.42, a: 0.38, pan: -0.18 },
  { t: 47.75, f: 77.78, a: 0.39, pan: 0.20 },
  { t: 50.75, f: 36.71, a: 0.54, pan: 0.00 },
];

const impacts = [
  { t: 17.75, a: 0.46 },
  { t: 25.00, a: 0.40 },
  { t: 27.50, a: 0.50 },
  { t: 32.90, a: 0.58 },
  { t: 36.15, a: 0.42 },
  { t: 41.25, a: 0.55 },
  { t: 45.00, a: 0.50 },
  { t: 47.75, a: 0.58 },
  { t: 50.75, a: 0.82 },
];

const risers = [
  { end: 17.75, len: 2.2, a: 0.10 },
  { end: 27.50, len: 2.0, a: 0.11 },
  { end: 32.90, len: 2.5, a: 0.13 },
  { end: 41.25, len: 2.8, a: 0.14 },
  { end: 50.75, len: 3.6, a: 0.19 },
];

const ticks = [];
for (let t = 18.2; t < 50.4;) {
  ticks.push(t);
  const progress = (t - 18.2) / (50.4 - 18.2);
  t += 1.18 - 0.62 * progress;
}

let seed = 0x2d4a11;
const randomSigned = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return ((seed >>> 0) / 0x80000000) - 1;
};

const pianoVoice = (t, channelPan) => {
  let sum = 0;
  for (const note of piano) {
    const dt = t - note.t;
    if (dt < 0 || dt > 5.2) continue;
    const attack = 1 - Math.exp(-95 * dt);
    const decay = Math.exp(-0.72 * dt);
    const panGain = channelPan < 0 ? (1 - note.pan) : (1 + note.pan);
    const body =
      Math.sin(tau * note.f * dt) +
      0.39 * Math.sin(tau * note.f * 2.006 * dt + 0.2) +
      0.17 * Math.sin(tau * note.f * 3.991 * dt + 0.7) +
      0.07 * Math.sin(tau * note.f * 6.02 * dt + 1.1);
    sum += note.a * panGain * attack * decay * body;
  }
  return sum;
};

let noiseLowL = 0;
let noiseLowR = 0;

for (let i = 0; i < frameCount; i += 1) {
  const t = i / sampleRate;
  const noiseL = randomSigned();
  const noiseR = randomSigned();

  const fadeIn = smoothstep(0.1, 1.25, t);
  const fadeOut = 1 - smoothstep(54.35, 55.125, t);
  const mainCut = 1 - smoothstep(50.82, 51.35, t);
  const build = 0.28 + 0.72 * smoothstep(12, 48.5, t);

  // Cuerdas graves: Re menor con una friccion de semitono para inquietud.
  const tremolo = 0.72 + 0.28 * Math.sin(tau * (3.7 + 1.5 * smoothstep(28, 49, t)) * t);
  const lowStrings = build * tremolo * (
    0.12 * Math.sin(tau * 36.708 * t + 0.18 * Math.sin(tau * 0.08 * t)) +
    0.045 * Math.sin(tau * 38.891 * t + 1.3) +
    0.030 * Math.sin(tau * 73.416 * t + 0.6)
  );

  // Ostinato grave que aparece en la segunda mitad y acompana el ritmo de montaje.
  let ostinato = 0;
  const step = 1.58 - 0.42 * smoothstep(30, 49, t);
  if (t >= 23 && t < 50.8) {
    const dt = (t - 23) % step;
    const env = Math.exp(-5.8 * dt) * (1 - Math.exp(-85 * dt));
    ostinato = 0.24 * env * Math.sin(tau * (57 * dt - 8.5 * dt * dt));
  }

  // Golpes cortos en los principales cambios de escena.
  let impact = 0;
  for (const event of impacts) {
    const dt = t - event.t;
    if (dt < 0 || dt > 2.8) continue;
    const env = Math.exp(-2.55 * dt) * (1 - Math.exp(-110 * dt));
    const phase = tau * (49 * dt - 7.0 * dt * dt);
    impact += event.a * env * (0.82 * Math.sin(phase) + 0.16 * Math.sin(2.04 * phase));
  }

  // Tic cinematografico cada vez mas rapido, sin el ambiente ruidoso del original.
  let tickL = 0;
  let tickR = 0;
  for (let j = 0; j < ticks.length; j += 1) {
    const dt = t - ticks[j];
    if (dt < 0 || dt > 0.075) continue;
    const env = Math.exp(-62 * dt);
    const accent = j % 4 === 0 ? 1.35 : 0.78;
    const tone = Math.sin(tau * 1730 * dt) + 0.45 * Math.sin(tau * 2460 * dt);
    if (j % 2 === 0) tickL += 0.035 * accent * env * tone;
    else tickR += 0.035 * accent * env * tone;
  }

  // Crescendos discretos antes de los impactos grandes.
  noiseLowL += 0.024 * (noiseL - noiseLowL);
  noiseLowR += 0.024 * (noiseR - noiseLowR);
  let riserL = 0;
  let riserR = 0;
  for (const r of risers) {
    const start = r.end - r.len;
    if (t < start || t >= r.end) continue;
    const u = (t - start) / r.len;
    const env = u * u * u;
    riserL += r.a * env * (0.74 * noiseLowL + 0.26 * noiseL * u);
    riserR += r.a * env * (0.74 * noiseLowR + 0.26 * noiseR * u);
  }

  // Cluster agudo de cuerdas durante el crecimiento final.
  const highIn = smoothstep(29.5, 38, t) * mainCut;
  const vibrato = 1.3 * Math.sin(tau * 5.4 * t);
  const highL = 0.030 * highIn * Math.sin(tau * (293.66 + vibrato) * t);
  const highR = 0.030 * highIn * Math.sin(tau * (311.13 - vibrato) * t + 0.8);

  const pianoL = pianoVoice(t, -1);
  const pianoR = pianoVoice(t, 1);
  const center = mainCut * (lowStrings + ostinato + impact);

  // Una nota final aislada sostiene la placa de titulo.
  const finalDt = t - 51.65;
  const finalEnv = finalDt >= 0 ? (1 - Math.exp(-70 * finalDt)) * Math.exp(-0.62 * finalDt) : 0;
  const finalNote = finalEnv * (
    0.26 * Math.sin(tau * 73.416 * Math.max(0, finalDt)) +
    0.09 * Math.sin(tau * 146.832 * Math.max(0, finalDt) + 0.3)
  );

  let left = fadeIn * fadeOut * (
    0.76 * center + 0.58 * pianoL + tickL + riserL + highL + finalNote
  );
  let right = fadeIn * fadeOut * (
    0.76 * center + 0.58 * pianoR + tickR + riserR + highR + finalNote
  );

  left = Math.tanh(1.32 * left) * 0.86;
  right = Math.tanh(1.32 * right) * 0.86;

  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 32767), i * 4);
  pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(pcm.length, 40);

fs.writeFileSync(output, Buffer.concat([header, pcm]));
console.log(`Segunda composicion creada: ${output}`);
console.log(`Duracion: ${duration.toFixed(3)} s | 48 kHz | PCM 16-bit estereo`);
