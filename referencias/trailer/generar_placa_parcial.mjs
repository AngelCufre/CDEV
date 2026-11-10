import fs from 'node:fs';

// Recrea la placa de 15,25 s con lluvia animada y el texto corregido.
// El texto se rasteriza previamente con Pango/GStreamer en una mascara RGB.

const width = 1280;
const height = 720;
const fps = 24;
const frames = 51; // 2,125 s: desde 15,250 hasta 17,375.
const maskPath = process.argv[2] ?? '/tmp/cdev_texto_parcial.rgb';
const outputPath = process.argv[3] ?? '/tmp/cdev_placa_parcial.rgb';
const mask = fs.readFileSync(maskPath);

if (mask.length !== width * height * 3) {
  throw new Error(`Mascara invalida: ${mask.length} bytes; se esperaban ${width * height * 3}`);
}

const smoothstep = (a, b, x) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

let seed = 0x16d15e;
const random = () => {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x1_0000_0000;
};

const drops = Array.from({ length: 185 }, () => ({
  x: random() * (width + 180) - 90,
  y: random() * (height + 160) - 80,
  speed: 260 + random() * 310,
  length: 10 + random() * 24,
  strength: 12 + random() * 32,
  phase: random() * (height + 180),
}));

const frameBytes = width * height * 3;
const output = Buffer.allocUnsafe(frameBytes * frames);

for (let frame = 0; frame < frames; frame += 1) {
  const t = frame / fps;
  const fadeIn = smoothstep(0.00, 0.48, t);
  const fadeOut = 1 - smoothstep(1.72, 2.125, t);
  const opacity = fadeIn * fadeOut;
  const offset = frame * frameBytes;

  // Fondo azul grisaceo con iluminacion radial, similar a la placa original.
  for (let y = 0; y < height; y += 1) {
    const ny = (y - height * 0.46) / (height * 0.72);
    for (let x = 0; x < width; x += 1) {
      const nx = (x - width * 0.50) / (width * 0.66);
      const glow = Math.exp(-(nx * nx * 1.55 + ny * ny * 1.15));
      const vignette = Math.max(0, 1 - 0.34 * (nx * nx + ny * ny));
      const i = offset + (y * width + x) * 3;
      output[i] = Math.round(opacity * vignette * (5 + 18 * glow));
      output[i + 1] = Math.round(opacity * vignette * (8 + 21 * glow));
      output[i + 2] = Math.round(opacity * vignette * (11 + 25 * glow));
    }
  }

  // Lluvia diagonal animada. Se dibuja antes del texto para que no reduzca su legibilidad.
  for (const drop of drops) {
    const cycle = height + 180;
    const headY = ((drop.y + drop.phase + drop.speed * t) % cycle) - 90;
    const headX = drop.x - 0.13 * drop.speed * t;
    const steps = Math.ceil(drop.length);
    for (let s = 0; s < steps; s += 1) {
      const y = Math.round(headY - s);
      const x = Math.round(headX + s * 0.12);
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const tail = 1 - s / steps;
      const value = opacity * drop.strength * tail;
      const i = offset + (y * width + x) * 3;
      output[i] = Math.min(255, output[i] + value * 0.72);
      output[i + 1] = Math.min(255, output[i + 1] + value * 0.84);
      output[i + 2] = Math.min(255, output[i + 2] + value);
    }
  }

  // Composicion de la mascara tipografica con el mismo fundido que la placa.
  for (let p = 0; p < width * height; p += 1) {
    const m = Math.max(mask[p * 3], mask[p * 3 + 1], mask[p * 3 + 2]) / 255;
    if (m < 0.004) continue;
    const alpha = m * opacity;
    const i = offset + p * 3;
    output[i] = Math.round(output[i] * (1 - alpha) + 218 * alpha);
    output[i + 1] = Math.round(output[i + 1] * (1 - alpha) + 218 * alpha);
    output[i + 2] = Math.round(output[i + 2] * (1 - alpha) + 218 * alpha);
  }
}

fs.writeFileSync(outputPath, output);
console.log(`Placa creada: ${outputPath}`);
console.log(`${frames} cuadros, ${(frames / fps).toFixed(3)} s, ${width}x${height} a ${fps} fps`);
