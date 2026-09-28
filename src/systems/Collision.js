import * as THREE from 'three';

/**
 * Colisiones simples por AABB entre el jugador (tratado como un cilindro
 * aproximado por su radio) y las cajas estáticas de la habitación (paredes, muebles).
 * Resuelve eje por eje para permitir "deslizarse" contra las superficies
 * en vez de trabarse al tocar un obstáculo en diagonal.
 */
export class Collision {
  constructor(radius) {
    this.radius = radius;
    this.obstacles = []; // Array<THREE.Box3>
    // Reutilizamos estas cajas/vectores para no asignar memoria en cada resolución.
    this._playerBox = new THREE.Box3();
    this._min = new THREE.Vector3();
    this._max = new THREE.Vector3();
  }

  addObstacle(box3) {
    this.obstacles.push(box3);
  }

  /**
   * Dado la posición actual y el desplazamiento deseado (Vector3, se modifica el resultado
   * en `outPosition`), devuelve la posición resultante ya resuelta contra obstáculos.
   * `position` es la posición horizontal del jugador (se ignora Y para las colisiones).
   */
  resolve(position, deltaX, deltaZ) {
    let x = position.x;
    let z = position.z;

    // Eje X
    x += deltaX;
    if (this._collidesAt(x, z)) {
      x -= deltaX;
    }

    // Eje Z (independiente, para permitir sliding)
    z += deltaZ;
    if (this._collidesAt(x, z)) {
      z -= deltaZ;
    }

    position.x = x;
    position.z = z;
  }

  _collidesAt(x, z) {
    const r = this.radius;
    this._min.set(x - r, 0, z - r);
    this._max.set(x + r, 2.2, z + r);
    this._playerBox.min.copy(this._min);
    this._playerBox.max.copy(this._max);

    for (let i = 0; i < this.obstacles.length; i += 1) {
      if (this._playerBox.intersectsBox(this.obstacles[i])) return true;
    }
    return false;
  }
}
