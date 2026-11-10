import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { config } from '../config.js';

/**
 * Pasada final, ya en espacio de pantalla (sRGB): viñeta suave y grano de película
 * siempre, y encima los efectos del estado del jugador:
 * - estrés: visión de túnel (los bordes se oscurecen y pierden color), aberración
 *   cromática y, por encima del umbral, un latido rojo en los bordes;
 * - mojado: la imagen se enfría y se apaga un poco;
 * - pantalla mojada (salpicadas): gotas que refractan la imagen y se van secando.
 */
const MoodShader = {
  name: 'MoodShader',
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uStress: { value: 0 },
    uPulse: { value: 0 },
    uWet: { value: 0 },
    uSplash: { value: 0 },
    uGrain: { value: 0 },
    uVignette: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uStress;
    uniform float uPulse;
    uniform float uWet;
    uniform float uSplash;
    uniform float uGrain;
    uniform float uVignette;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Gotas sobre la pantalla: a lo sumo una por celda, en dos tamaños. Dentro de cada
    // gota la imagen se ve invertida, como a través de una lente. Con menos uSplash
    // quedan menos gotas, más chicas y un poco más abajo (se escurren y se secan).
    // xy = desvío, z = borde de la gota. Centro + escurrido + radio nunca pasan el borde
    // de la celda, para que ninguna gota quede cortada.
    vec3 droplets(vec2 uv, float aspect) {
      vec3 result = vec3(0.0);
      for (int layer = 0; layer < 2; layer++) {
        float scale = layer == 0 ? 6.0 : 11.0;
        vec2 p = vec2(uv.x * aspect, uv.y) * scale;
        vec2 cell = floor(p);
        float seed = hash12(cell + float(layer) * 31.7);
        if (seed < 1.0 - 0.38 * uSplash) continue;
        vec2 center = (vec2(hash12(cell + 3.7), hash12(cell + 9.1)) - 0.5) * 0.3;
        center.y -= (1.0 - uSplash) * 0.12 * hash12(cell + 1.9);
        float radius = mix(0.1, 0.22, hash12(cell + 5.3)) * sqrt(uSplash);
        vec2 d = fract(p) - 0.5 - center;
        float len = length(d);
        float inside = 1.0 - smoothstep(radius * 0.8, radius, len);
        vec2 offset = -d * 1.4 * inside / scale;
        result.xy += vec2(offset.x / aspect, offset.y);
        result.z = max(result.z, inside * smoothstep(radius * 0.6, radius, len));
      }
      return result;
    }

    void main() {
      float aspect = uResolution.x / uResolution.y;
      vec2 uv = vUv;
      float dropEdge = 0.0;
      if (uSplash > 0.001) {
        vec3 drops = droplets(vUv, aspect);
        uv += drops.xy;
        dropEdge = drops.z;
      }

      vec2 centered = vUv - 0.5;
      // 0 en el centro, 1 en las esquinas (corregido por el aspecto de la pantalla).
      float dist = length(centered * vec2(aspect, 1.0)) / length(vec2(aspect, 1.0) * 0.5);
      float stress = uStress;

      // Aberración cromática: los canales se separan hacia los bordes.
      float aberration = (0.0006 + 0.0045 * stress * stress + 0.003 * stress * uPulse) * dist * dist;
      vec2 dir = normalize(centered + 1e-5) * aberration;
      vec3 color;
      color.r = texture2D(tDiffuse, uv + dir).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - dir).b;
      color *= 1.0 - dropEdge * 0.12;

      // Mojado: más frío y algo más apagado.
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(luma), uWet * 0.15);
      color *= mix(vec3(1.0), vec3(0.94, 0.98, 1.05), uWet);

      // Estrés: los bordes pierden color (visión de túnel).
      luma = dot(color, vec3(0.299, 0.587, 0.114));
      color = mix(color, vec3(luma), smoothstep(0.3, 1.0, dist) * stress * 0.7);

      // Viñeta: base suave que se cierra con el estrés y late con el corazón.
      float inner = 0.5 - 0.3 * stress - 0.06 * stress * uPulse;
      float outer = 1.3 - 0.4 * stress;
      float shade = smoothstep(inner, outer, dist);
      color *= 1.0 - shade * (uVignette + 0.4 * stress);

      // Latido rojo, solo en el borde de afuera, cuando el estrés es alto.
      float red = smoothstep(0.55, 1.2, dist) * smoothstep(0.45, 0.95, stress) * uPulse;
      color = mix(color, vec3(0.45, 0.03, 0.03), red * 0.38);

      // Grano de película (un poco más fuerte con estrés).
      float noise = hash12(gl_FragCoord.xy + fract(uTime * 13.7) * 571.0) - 0.5;
      color += noise * (uGrain + 0.02 * stress);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/**
 * Post-procesado: la escena se dibuja a una textura con antialiasing (MSAA), se pasa a
 * sRGB (OutputPass) y la pasada final aplica MoodShader. Engine lo usa en lugar de
 * `renderer.render` cuando config.render.postProceso está activo.
 */
export class PostProcessing {
  constructor(renderer, camera) {
    this.renderer = renderer;
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: config.render.muestrasMSAA,
    });
    this.composer = new EffectComposer(renderer, target);
    this.renderPass = new RenderPass(null, camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(new OutputPass());
    this.moodPass = new ShaderPass(MoodShader);
    this.composer.addPass(this.moodPass);

    const uniforms = this.moodPass.uniforms;
    uniforms.uGrain.value = config.render.grano;
    uniforms.uVignette.value = config.render.vineta;

    // Cada frame hace varios render(): renderer.info se reinicia a mano al empezar el
    // frame para que el panel de debug siga mostrando el total.
    renderer.info.autoReset = false;
  }

  setSize(width, height) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(width, height);
    const pixelRatio = this.renderer.getPixelRatio();
    this.moodPass.uniforms.uResolution.value.set(width * pixelRatio, height * pixelRatio);
  }

  /** Estado del jugador que se ve en pantalla. Todos los valores van de 0 a 1. */
  setMood({ stress, pulse, wet, splash }) {
    const uniforms = this.moodPass.uniforms;
    uniforms.uStress.value = stress;
    uniforms.uPulse.value = pulse;
    uniforms.uWet.value = wet;
    uniforms.uSplash.value = splash;
  }

  render(scene, delta) {
    this.renderer.info.reset();
    this.renderPass.scene = scene;
    this.moodPass.uniforms.uTime.value += delta;
    this.composer.render(delta);
  }

  dispose() {
    this.composer.dispose();
  }
}
