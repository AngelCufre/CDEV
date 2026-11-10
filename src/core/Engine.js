import * as THREE from 'three';
import { config } from '../config.js';
import { PostProcessing } from './PostProcessing.js';

/**
 * Motor base: renderer, cámara, loop de render, resize y pausa por visibilidad.
 * No sabe nada de narrativa ni de la escena concreta — solo orquesta el ciclo de vida
 * de Three.js y delega el contenido a la escena activa vía callbacks.
 */
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.render.pixelRatioMax));
    this.renderer.shadowMap.enabled = config.render.sombras;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // La escena es mayormente estática: el shadow map no necesita recalcularse cada frame.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(
      config.player.fov,
      window.innerWidth / window.innerHeight,
      config.player.near,
      config.player.far,
    );

    this.post = config.render.postProceso ? new PostProcessing(this.renderer, this.camera) : null;

    this.clock = new THREE.Clock();
    this._updateCallback = null;
    this._rafId = null;
    this._isRunning = false;

    this._onResize = this._onResize.bind(this);
    this._onVisibilityChange = this._onVisibilityChange.bind(this);
    this._tick = this._tick.bind(this);

    window.addEventListener('resize', this._onResize);
    document.addEventListener('visibilitychange', this._onVisibilityChange);

    this._onResize();
  }

  /** Marca que el shadow map necesita recalcularse una vez (tras cambios de geometría/luz). */
  requestShadowUpdate() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Dibuja la escena desde la cámara del jugador (con post-procesado si está activo). */
  render(scene, delta) {
    if (this.post) this.post.render(scene, delta);
    else this.renderer.render(scene, this.camera);
  }

  /**
   * Registra la función que se ejecuta cada frame con (delta, elapsed).
   * Debe devolver la escena/objeto a renderizar o encargarse de llamar renderer.render.
   */
  start(updateCallback) {
    this._updateCallback = updateCallback;
    if (this._isRunning) return;
    this._isRunning = true;
    this.clock.start();
    this._tick();
  }

  stop() {
    this._isRunning = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick() {
    if (!this._isRunning) return;
    this._rafId = requestAnimationFrame(this._tick);
    const delta = Math.min(this.clock.getDelta(), 0.1); // clamp por si hubo un tab-switch
    if (this._updateCallback) this._updateCallback(delta);
  }

  _onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.post?.setSize(width, height);
  }

  _onVisibilityChange() {
    if (document.hidden) {
      this.stop();
    } else if (this._updateCallback) {
      this.start(this._updateCallback);
    }
  }

  dispose() {
    this.stop();
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('visibilitychange', this._onVisibilityChange);
    this.post?.dispose();
    this.renderer.dispose();
  }
}
