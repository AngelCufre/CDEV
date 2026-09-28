/**
 * Configuración centralizada del proyecto.
 * Todos los parámetros ajustables (horarios, velocidades, intensidades)
 * viven acá para no quedar dispersos entre escenas y sistemas.
 */

export const config = {
  // --- Narrativa ---
  narrative: {
    horaParcial: '08:00',
    horaDespertar: '07:52',
    aula: 'Aula 312',
    notificaciones: [
      '¿Dónde estás? Ya empezó a tomar lista.',
      'Parcial de hoy, Aula 312 — 8:00 hs.',
      '3 llamadas perdidas de Mamá',
    ],
  },

  // --- Cámara / jugador ---
  player: {
    alturaOjos: 1.65,
    velocidadCaminar: 2.6, // m/s
    radioColision: 0.35,
    fov: 70,
    near: 0.05,
    far: 50,
  },

  // --- Animación de levantarse ---
  gettingUp: {
    duracionSegundos: 2.2,
    // posición/rotación de la cámara acostada vs. sentada se definen en narrative.js
  },

  // --- Dormido (SLEEPING) ---
  sleeping: {
    duracionSegundos: 1.6,
  },

  // --- Despertar (WAKING) ---
  waking: {
    duracionSegundos: 3.5,
    numeroParpadeos: 3,
  },

  // --- Darse cuenta (REALIZATION) ---
  realization: {
    textoDelaySegundos: 0.5,
    notificacionesDelaySegundos: 1.3,
    fundidoDelaySegundos: 4.6,
    finDeEscenaDelaySegundos: 7.5,
    zoomFov: 62, // el FOV baja desde config.player.fov para dar sensación de acercamiento
  },

  // --- Iluminación ---
  luces: {
    solIntensidad: 3.2,
    solColor: 0xfff1d6,
    // Luz de relleno con HemisphereLight (cielo frío arriba, rebote cálido del piso
    // abajo) en vez de un AmbientLight plano: da una sensación más natural sin
    // sumar una segunda luz con sombras.
    cieloColor: 0xbcd2e8,
    sueloColor: 0x8a6a45,
    ambienteIntensidad: 0.4,
    shadowMapSize: 1024,
  },

  // --- Render / performance ---
  render: {
    pixelRatioMax: 2,
    sombras: true,
  },

  // --- Interacción ---
  interaccion: {
    distanciaMaxima: 2.2,
    intervaloRaycastMs: 100, // throttle del raycast de hover
  },

  // --- Audio ---
  audio: {
    volumenAlarma: 0.35,
    volumenLatido: 0.4,
    volumenAmbiente: 0.15,
  },
};
