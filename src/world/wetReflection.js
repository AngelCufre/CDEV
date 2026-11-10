import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Capa de lo que no aparece en los reflejos del piso mojado: la lluvia y las ondas de
 * los charcos. La cámara del jugador la ve; la del reflejo, no.
 */
export const NO_REFLECTION_LAYER = 1;

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  uniform mat4 uTextureMatrix;
  varying vec4 vReflectionCoord;
  varying vec3 vWorldPosition;
  varying vec3 vBaseColor;
  varying float vFacingUp;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vReflectionCoord = uTextureMatrix * worldPosition;
    #ifdef USE_COLOR
      vBaseColor = color;
    #else
      vBaseColor = vec3(1.0);
    #endif
    // Solo reflejan las caras que miran hacia arriba (no los costados del cordón).
    vFacingUp = smoothstep(0.7, 0.95, normalize(mat3(modelMatrix) * normal).y);
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D tReflection;
  uniform vec3 uColor;
  uniform float uReflectivity;
  uniform float uMinReflect;
  uniform float uDarken;
  uniform float uStreak;
  uniform float uDistortion;
  uniform float uTime;
  #ifdef USE_PAVING_MAP
    uniform sampler2D uMap;
    uniform float uMapScale;
    uniform vec2 uMapRotation;
  #endif
  varying vec4 vReflectionCoord;
  varying vec3 vWorldPosition;
  varying vec3 vBaseColor;
  varying float vFacingUp;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    // Mojado, el piso se ve más oscuro.
    vec3 base = uColor * vBaseColor * uDarken;
    #ifdef USE_PAVING_MAP
      // Textura de baldosas o adoquines en coordenadas de mundo (sin UV), girada.
      vec2 xz = vWorldPosition.xz;
      vec2 paving = vec2(
        xz.x * uMapRotation.x - xz.y * uMapRotation.y,
        xz.x * uMapRotation.y + xz.y * uMapRotation.x
      );
      base *= texture2D(uMap, paving / uMapScale).rgb;
      // Manchones de humedad de varios metros: que no se note la repetición.
      base *= 0.86 + 0.28 * valueNoise(xz * 0.3);
    #endif
    vec3 color = base;

    if (uReflectivity > 0.0 && vFacingUp > 0.0) {
      vec2 uv = vReflectionCoord.xy / vReflectionCoord.w;
      // La lluvia no deja quieta el agua: el reflejo tiembla.
      vec2 p = vWorldPosition.xz * 3.0;
      vec2 wobble = vec2(valueNoise(p + uTime * 1.7), valueNoise(p.yx * 1.3 - uTime * 1.3)) - 0.5;
      uv += wobble * uDistortion;

      // Estela vertical: cada luz se estira hacia quien mira, como en el asfalto mojado.
      vec3 reflection = vec3(0.0);
      float total = 0.0;
      for (int i = 0; i < 8; i++) {
        float t = float(i) / 7.0;
        float weight = 1.0 - 0.75 * t;
        reflection += texture2D(tReflection, uv + vec2(0.0, t * uStreak)).rgb * weight;
        total += weight;
      }
      reflection /= total;
      // Las luces fuertes (faroles, faros, ventanas) brillan más en el agua.
      float luma = dot(reflection, vec3(0.2126, 0.7152, 0.0722));
      reflection *= 1.0 + smoothstep(0.5, 1.0, luma) * 1.5;

      // Fresnel: mirando de costado el agua es casi un espejo; desde arriba, refleja poco.
      vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
      float fresnel = uMinReflect + (1.0 - uMinReflect) * pow(1.0 - clamp(viewDirection.y, 0.0, 1.0), 4.0);
      color = mix(base, reflection, clamp(fresnel * uReflectivity * vFacingUp, 0.0, 1.0));
    }

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const _size = new THREE.Vector2();
const _cameraPosition = new THREE.Vector3();
const _lookAt = new THREE.Vector3();
const _rotation = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);
const _pointOnPlane = new THREE.Vector3();
const _plane = new THREE.Plane();
const _clipPlane = new THREE.Vector4();
const _q = new THREE.Vector4();

/**
 * Reflejo de un piso mojado horizontal (a la altura `y`): cada frame dibuja la escena
 * desde una cámara espejada debajo del plano, a una textura de menor resolución, y las
 * superficies creadas con `createSurface` la muestran borroneada, estirada en vertical y
 * temblando con la lluvia. Es la técnica de three.js `Reflector`, pero con un solo render
 * compartido por varias superficies del mismo plano (calle, marcas, charcos…).
 */
export class WetReflection {
  /**
   * `hide`: objetos que nunca aparecen en el reflejo (por ejemplo, el interior del
   * colectivo): se ocultan mientras se dibuja, para no gastar en ellos.
   */
  constructor({ y, resolution = config.render.resolucionReflejos, hide = [] }) {
    this.y = y;
    this.resolution = resolution;
    this.hidden = hide;
    this.enabled = config.render.reflejos;
    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.camera = new THREE.PerspectiveCamera();
    this.camera.layers.set(0);
    this.textureMatrix = new THREE.Matrix4();
    this.surfaces = [];
    // Compartidos por todos los materiales de este plano.
    this._uniforms = {
      tReflection: { value: this.renderTarget.texture },
      uTextureMatrix: { value: this.textureMatrix },
      uTime: { value: 0 },
    };
  }

  /**
   * Mesh mojado sobre este plano. Toma los colores por vértice de la geometría si los
   * tiene (los de `paint`). Opciones: `reflectivity` (0..1), `darken` (cuánto oscurece el
   * agua el color base), `streak` (largo de la estela), `distortion` (temblor), `color`
   * y propiedades extra de material (por ejemplo `polygonOffset`). `map` es una textura
   * de piso (baldosas, adoquines) que se aplica por coordenadas de mundo: una repetición
   * cada `mapScale` metros, girada `mapRotation` radianes.
   */
  createSurface(
    geometry,
    {
      reflectivity = 0.6,
      minReflect = 0.05,
      darken = 0.8,
      streak = 0.05,
      distortion = 0.01,
      color = 0xffffff,
      map = null,
      mapScale = 1,
      mapRotation = 0,
      ...materialOptions
    } = {},
  ) {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
        ...this._uniforms,
        uColor: { value: new THREE.Color(color) },
        uReflectivity: { value: this.enabled ? reflectivity : 0 },
        uMinReflect: { value: minReflect },
        uDarken: { value: darken },
        uStreak: { value: streak },
        uDistortion: { value: distortion },
        uMap: { value: map },
        uMapScale: { value: mapScale },
        uMapRotation: { value: new THREE.Vector2(Math.cos(mapRotation), Math.sin(mapRotation)) },
      },
      defines: map ? { USE_PAVING_MAP: '' } : {},
      vertexShader,
      fragmentShader,
      vertexColors: geometry.attributes.color !== undefined,
      fog: true,
      ...materialOptions,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.surfaces.push(mesh);
    return mesh;
  }

  /** Dibuja el reflejo para la cámara del jugador. Va justo antes del render del frame. */
  update(renderer, scene, camera) {
    this._uniforms.uTime.value = performance.now() / 1000;
    if (!this.enabled) return;

    renderer.getDrawingBufferSize(_size);
    const width = Math.max(1, Math.round(_size.x * this.resolution));
    const height = Math.max(1, Math.round(_size.y * this.resolution));
    if (this.renderTarget.width !== width || this.renderTarget.height !== height) {
      this.renderTarget.setSize(width, height);
    }

    // La cámara del jugador puede haberse movido recién (balanceo, temblor).
    camera.updateMatrixWorld();
    _cameraPosition.setFromMatrixPosition(camera.matrixWorld);
    _rotation.extractRotation(camera.matrixWorld);
    _lookAt.set(0, 0, -1).applyMatrix4(_rotation).add(_cameraPosition);

    // Cámara espejada respecto del plano horizontal y = this.y.
    const mirror = this.camera;
    mirror.position.set(_cameraPosition.x, 2 * this.y - _cameraPosition.y, _cameraPosition.z);
    mirror.up.set(0, 1, 0).applyMatrix4(_rotation);
    mirror.up.y = -mirror.up.y;
    mirror.lookAt(_lookAt.x, 2 * this.y - _lookAt.y, _lookAt.z);
    mirror.far = camera.far;
    mirror.updateMatrixWorld();
    mirror.projectionMatrix.copy(camera.projectionMatrix);

    // De coordenadas de mundo a coordenadas de la textura del reflejo.
    this.textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    this.textureMatrix.multiply(mirror.projectionMatrix).multiply(mirror.matrixWorldInverse);

    // Plano de recorte oblicuo: no dibuja lo que queda debajo del piso
    // (http://www.terathon.com/lengyel/Lengyel-Oblique.pdf).
    _plane.setFromNormalAndCoplanarPoint(_up, _pointOnPlane.set(0, this.y, 0));
    _plane.applyMatrix4(mirror.matrixWorldInverse);
    _clipPlane.set(_plane.normal.x, _plane.normal.y, _plane.normal.z, _plane.constant);
    const e = mirror.projectionMatrix.elements;
    _q.set(
      (Math.sign(_clipPlane.x) + e[8]) / e[0],
      (Math.sign(_clipPlane.y) + e[9]) / e[5],
      -1,
      (1 + e[10]) / e[14],
    );
    _clipPlane.multiplyScalar(2 / _clipPlane.dot(_q));
    e[2] = _clipPlane.x;
    e[6] = _clipPlane.y;
    e[10] = _clipPlane.z + 1;
    e[14] = _clipPlane.w;

    // Las superficies de este plano no se dibujan en su propio reflejo (leerían la
    // textura en la que se está escribiendo).
    const skipped = [...this.surfaces, ...this.hidden];
    const visibility = skipped.map((object) => object.visible);
    for (const object of skipped) object.visible = false;
    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, mirror);
    renderer.setRenderTarget(previousTarget);
    skipped.forEach((object, i) => {
      object.visible = visibility[i];
    });
  }

  dispose() {
    this.renderTarget.dispose();
  }
}
