import * as THREE from 'three';
import { config } from '../config.js';

/**
 * Detecta, mediante raycasting, qué objeto interactuable está bajo la mira
 * (el centro de la pantalla, ya que usamos PointerLockControls en primera persona).
 * El raycast se throttlea (no corre en cada frame) y solo se prueba contra la
 * lista explícita de interactuables, nunca contra toda la escena.
 */
export class Interaction {
  constructor(camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = config.interaccion.distanciaMaxima;
    this._origin = new THREE.Vector2(0, 0); // centro de pantalla

    this.interactables = []; // Array<{ mesh, label, onInteract, isEnabled }>
    this.hovered = null;

    this._accumMs = 0;
    this._onHoverChange = null;
  }

  /**
   * `isEnabled` (opcional) decide en cada raycast si el objeto cuenta: por ejemplo,
   * la puerta de la habitación solo sirve después de darse cuenta de la hora.
   */
  register(mesh, label, onInteract, isEnabled = () => true) {
    this.interactables.push({ mesh, label, onInteract, isEnabled });
  }

  unregisterAll() {
    this.interactables = [];
    this.hovered = null;
  }

  onHoverChange(callback) {
    this._onHoverChange = callback;
  }

  update(deltaMs) {
    this._accumMs += deltaMs;
    if (this._accumMs < config.interaccion.intervaloRaycastMs) return;
    this._accumMs = 0;

    this.raycaster.setFromCamera(this._origin, this.camera);
    const meshes = this.interactables
      .filter((entry) => entry.isEnabled())
      .map((entry) => entry.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);

    const hitEntry = hits.length > 0 ? this._findEntry(hits[0].object) : null;

    if (hitEntry !== this.hovered) {
      this.hovered = hitEntry;
      if (this._onHoverChange) this._onHoverChange(hitEntry);
    }
  }

  /** Dispara la interacción sobre el objeto actualmente resaltado (si hay uno). */
  triggerInteract() {
    if (this.hovered?.isEnabled()) this.hovered.onInteract();
  }

  _findEntry(mesh) {
    return this.interactables.find((entry) => entry.mesh === mesh) ?? null;
  }
}
