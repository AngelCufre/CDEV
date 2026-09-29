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
    // Después de esto vuelve el control: hay que salir por la puerta.
    volverAExplorarSegundos: 5.5,
    zoomFov: 62, // el FOV baja desde config.player.fov para dar sensación de acercamiento
  },

  // --- Salir de la habitación ---
  salida: {
    textoFundido: 'Minutos después…',
    duracionFundidoSegundos: 2.4,
  },

  // --- Escena 2: la parada del colectivo ---
  parada: {
    horaInicio: '07:57',
    // Tiempo acelerado: 1 minuto de juego cada estos segundos reales.
    segundosPorMinuto: 8,
    // El colectivo aparece a lo lejos a estos segundos de empezar la escena.
    colectivoApareceSegundos: 55,
    linea: '18',
    destino: 'CIUDAD UNIV.',
    bateriaCelular: 9, // %
    // Ya estaban en el celular desde la habitación (las mismas de la escena 1).
    notificacionesPrevias: [
      { de: 'Grupo Parcial', texto: '¿Dónde estás? Ya empezó a tomar lista.' },
      { de: 'Calendario', texto: 'Parcial de hoy, Aula 312 — 8:00 hs.' },
      { de: 'Teléfono', texto: '3 llamadas perdidas de Mamá' },
    ],
    // Llegan al celular cuando el reloj de juego marca esa hora.
    notificaciones: [
      { hora: '07:58', de: 'Mamá', texto: '¿Ya saliste? Llevá paraguas que llueve fuerte' },
      { hora: '08:00', de: 'Grupo Parcial', texto: 'Ya están repartiendo los temas 😬' },
      {
        hora: '08:02',
        de: 'Campus Virtual',
        texto: 'Recordatorio: no se permite el ingreso pasados 15 min del inicio.',
      },
      { hora: '08:04', de: 'Grupo Parcial', texto: '¿Venís? Te guardo lugar al fondo' },
    ],
    autos: {
      intervaloMinSegundos: 5,
      intervaloMaxSegundos: 11,
      velocidadMin: 11, // m/s
      velocidadMax: 14,
    },
    colectivo: {
      velocidad: 9, // m/s
      frenado: 2.2, // m/s²
    },
  },

  // --- Iluminación ---
  // Día nublado: la "luz del sol" es la claridad difusa y fría que entra por la ventana.
  luces: {
    solIntensidad: 1.7,
    solColor: 0xdbe3ea,
    // Luz de relleno con HemisphereLight (cielo frío arriba, rebote cálido del piso
    // abajo) en vez de un AmbientLight plano: da una sensación más natural sin
    // sumar una segunda luz con sombras.
    cieloColor: 0xaab6c2,
    sueloColor: 0x6b5a48,
    ambienteIntensidad: 0.8,
    shadowMapSize: 1024,
  },

  // --- Exterior (paisaje visto por la ventana) ---
  exterior: {
    // Niebla lineal: arranca más lejos que la diagonal de la habitación (~6.6 m)
    // para que solo afecte al paisaje, nunca al interior.
    nieblaColor: 0x8e979f,
    nieblaCerca: 7,
    nieblaLejos: 38,
    radioCielo: 40, // debe quedar dentro de config.player.far
    lluvia: {
      cantidadGotas: 1800,
      velocidad: 9, // m/s
      largoGota: 0.35,
      viento: 0.9, // desplazamiento lateral (m/s) para que la lluvia caiga inclinada
    },
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
    volumenLluvia: 0.1,
    volumenLluviaExterior: 0.22,
    volumenAutos: 0.55,
    volumenColectivo: 0.8,
    volumenSalpicadura: 0.5,
    volumenVibracion: 0.25,
  },
};
