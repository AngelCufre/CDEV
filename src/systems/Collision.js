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
    this._fromBox = new THREE.Box3();
    this._toBox = new THREE.Box3();
    this._center = new THREE.Vector3();
  }

  addObstacle(box3) {
    this.obstacles.push(box3);
  }

  /**
   * Aplica el desplazamiento deseado (deltaX, deltaZ) sobre `position`, resolviendo
   * contra los obstáculos. Se ignora Y para las colisiones.
   */
  resolve(position, deltaX, deltaZ) {
    let x = position.x;
    let z = position.z;

    // Eje X
    if (this._canMove(x, z, x + deltaX, z)) x += deltaX;

    // Eje Z (independiente, para permitir sliding)
    if (this._canMove(x, z, x, z + deltaZ)) z += deltaZ;

    position.x = x;
    position.z = z;
  }

  _canMove(fromX, fromZ, toX, toZ) {
    this._setPlayerBox(this._fromBox, fromX, fromZ);
    this._setPlayerBox(this._toBox, toX, toZ);

    for (let i = 0; i < this.obstacles.length; i += 1) {
      const obstacle = this.obstacles[i];
      if (!this._toBox.intersectsBox(obstacle)) continue;
      if (!this._fromBox.intersectsBox(obstacle)) return false;

      // Ya estaba encimado (por ejemplo, si una pose de animación lo dejó adentro):
      // se permite solo alejarse del centro del obstáculo, para que pueda salir
      // en vez de quedar trabado, pero no meterse más.
      obstacle.getCenter(this._center);
      const away =
        (toX - fromX) * (fromX - this._center.x) + (toZ - fromZ) * (fromZ - this._center.z);
      if (away <= 0) return false;
    }
    return true;
  }

  _setPlayerBox(box, x, z) {
    const r = this.radius;
    box.min.set(x - r, 0, z - r);
    box.max.set(x + r, 2.2, z + r);
  }
}
