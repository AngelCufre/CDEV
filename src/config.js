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
    aula: 'Aula 500',
    notificaciones: [
      '¿Dónde estás? Ya empezó a tomar lista.',
      'Parcial de hoy, Aula 500 — 8:00 hs.',
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
    // Los colectivos recién empiezan a venir cuando el jugador llega a la parada.
    // El primero viene lleno y no para; el segundo sí.
    primerColectivoSegundos: 8, // desde que llega a la parada
    segundoColectivoSegundos: 20, // desde que el primero se pierde de vista
    linea: '18',
    destino: 'CIUDAD UNIV.',
    bateriaCelular: 9, // %
    // Ya estaban en el celular desde la habitación (las mismas de la escena 1).
    notificacionesPrevias: [
      { de: 'Grupo Parcial', texto: '¿Dónde estás? Ya empezó a tomar lista.' },
      { de: 'Calendario', texto: 'Parcial de hoy, Aula 500 — 8:00 hs.' },
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
      // El lleno "amaga" a frenar al pasar por la parada pero no baja de esta velocidad.
      velocidadMinimaLleno: 5.5, // m/s
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
    shadowMapSize: 2048,
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

  // --- Escena 3: arriba del colectivo lleno ---
  viaje: {
    textoFundidoEntrada: 'Arriba del 18…',
    // Solo si se arranca directo con ?escena=colectivo; si no, sigue la hora de la parada.
    horaInicio: '08:05',
    segundosPorMinuto: 8,
    velocidadCaminar: 1.3, // m/s: apretado entre la gente
    radioColision: 0.22, // más chico que el normal: se pasa de costado entre la gente
    colectivo: {
      velocidad: 9, // m/s
      aceleracion: 1.4, // m/s²
      frenado: 2.2, // m/s²
    },
    // Parada intermedia donde se baja el pasajero que deja el asiento libre.
    paradaIntermediaSegundos: 9,
    esperaEnParadaSegundos: 4,
    // Te ganan el asiento cuando te acercás a menos de esta distancia (m); si no vas,
    // a los `asientoTimeoutSegundos` se sienta otro igual.
    distanciaAsiento: 1.8,
    asientoTimeoutSegundos: 18,
    // Segundos (después de lo del asiento) hasta que anuncian la parada de la facultad.
    anuncioFacultadSegundos: 10,
    paradaFinal: 'Ciudad Universitaria',
    notificaciones: [
      { hora: '08:06', de: 'Grupo Parcial', texto: 'Ya están todos escribiendo… ¿venís?' },
      { hora: '08:08', de: 'Mamá', texto: '¿Pudiste agarrar el colectivo?' },
      {
        hora: '08:10',
        de: 'Grupo Parcial',
        texto: 'El profe dice que hasta 8:15 te deja entrar 🙏',
      },
      { hora: '08:13', de: 'Grupo Parcial', texto: '¿¿Dónde estás??' },
    ],
  },

  // --- Escena 4: adentro del Edificio Gallardo (BOCETO: salvo el aula 500 en planta baja,
  // el edificio todavía es inventado) ---
  facultad: {
    textoFundidoEntrada: 'Corriendo bajo la lluvia…',
    // Solo si se arranca directo con ?escena=facultad; si no, sigue la hora del colectivo.
    horaInicio: '08:12',
    segundosPorMinuto: 8,
    aula: 'aula 500',
    // Según qué tan mojado llega (stat "mojado"): se usa el primero cuyo `desde` alcanza.
    textosLlegada: [
      { desde: 60, texto: 'Empapado… pero llegaste.' },
      { desde: 30, texto: 'Con la ropa mojada… pero llegaste.' },
      { desde: 0, texto: 'Casi sin mojarte… y llegaste.' },
    ],
    // A los segundos de entrar escribe el grupo (no depende de la hora, para que llegue
    // aunque se haya tardado en el colectivo).
    mensajeAlEntrarSegundos: 3,
    mensajeAlEntrar: { de: 'Grupo Parcial', texto: 'Ya estamos todos en la 500… ¿llegaste?' },
    notificaciones: [
      { hora: '08:15', de: 'Grupo Parcial', texto: 'Y cuarto… ¿llegás?' },
      { hora: '08:17', de: 'Grupo Parcial', texto: 'El profe está por cerrar la puerta 😬' },
      { hora: '08:19', de: 'Mamá', texto: '¿Llegaste bien? Avisame' },
    ],
    textos: {
      ascensor: 'Fuera de servicio. Obvio.',
      bedelia: 'Cerrado. Atienden de 9 a 12.',
      directorio: 'Planta baja: aulas 501 a 508 · 1° piso: aulas 511 a 518… ¿Y la 500?',
      puertaAula: '—Permiso… ¿se puede?',
    },
  },

  // --- Stats del jugador (HUD arriba a la derecha) ---
  // Valores de 0 a 100. Los eventos suman o restan de golpe (con aviso en el HUD); los
  // ritmos cambian de a poco, por segundo real.
  stats: {
    inicial: { estres: 5, mojado: 0, preparacion: 25 },
    nombresEscenas: {
      habitacion: 'La habitación',
      parada: 'La parada',
      colectivo: 'El colectivo',
      facultad: 'La facultad',
    },
    // Nervios por la hora: estrés por segundo desde que sabe que llega tarde. Se
    // multiplica por (1 + minutos de atraso / minutosParaDuplicar), con hasta 20 min.
    atraso: { estresPorSegundo: 0.06, minutosParaDuplicar: 6 },
    // Extra mientras anunciaron la parada de la facultad y todavía no tocó el timbre.
    apuroTimbrePorSegundo: 0.3,
    lluviaMojadoPorSegundo: 0.5, // afuera, sin paraguas
    secadoPorSegundo: 0.04, // bajo techo
    mojadoPorPisada: 2, // cada paso dentro de un charco, después del primero
    segundosPorHoja: 2, // mirando una hoja de los apuntes para que cuente como repasada
    // Estrés que suma cada mensaje que llega al celular, según quién lo manda.
    mensajes: { 'Grupo Parcial': 2, 'Campus Virtual': 3, Mamá: 1, otro: 1 },
    // Los autos (y el colectivo lleno) que pasan por el carril de la vereda te salpican
    // si estás a menos de `distanciaCordon` metros del cordón.
    salpicadura: { distanciaCordon: 1.0, velocidadMinima: 5, esperaSegundos: 12 },
    // Respirar hondo (mantener Espacio, quieto): baja el estrés hasta `piso`, pero el
    // reloj sigue corriendo. El HUD lo sugiere a partir de `avisoDesde`.
    respirar: { porSegundo: 3, piso: 15, avisoDesde: 40 },
    // Corazón: latidos por minuto con estrés 0 y 100. Por encima de `umbral` se escucha
    // y los bordes de la pantalla laten en rojo.
    latido: { lpmMin: 68, lpmMax: 150, umbral: 45 },
    // `pantallaMojada` (0..1): gotas de agua sobre la pantalla que se van secando.
    eventos: {
      dormido: { estres: 15, texto: 'Te quedaste dormido' },
      mensajesSinLeer: { estres: 6, texto: 'Mensajes sin leer' },
      hojaTranquilo: { preparacion: 14, estres: -2, texto: 'Repasaste una hoja' },
      hojaApurado: { preparacion: 10, estres: 3, texto: 'Repaso a las apuradas' },
      charco: { mojado: 8, estres: 2, texto: 'Pisaste un charco' },
      salpicadaAuto: { mojado: 18, estres: 5, texto: 'Un auto te salpicó', pantallaMojada: 1 },
      salpicadaColectivo: {
        mojado: 22,
        estres: 6,
        texto: 'El colectivo te empapó',
        pantallaMojada: 1,
      },
      colectivoLleno: { estres: 10, texto: 'El colectivo pasó lleno' },
      llegoColectivo: { estres: -6, texto: '¡Por fin un colectivo!' },
      permiso: { estres: 1, texto: 'Apretado entre la gente' },
      asientoGanado: { estres: 6, texto: 'Te ganaron el asiento' },
      asientoOcupado: { estres: 3, texto: 'Se ocupó el asiento libre' },
      timbre: { estres: -3, texto: 'Parada solicitada' },
      corriendoLluvia: { mojado: 12, texto: 'Corriste bajo la lluvia', pantallaMojada: 0.6 },
      ascensor: { estres: 4, texto: 'Ascensor fuera de servicio' },
      bedelia: { estres: 3, texto: 'Bedelía cerrada' },
      directorio: { estres: 4, texto: '¿Y la 500?' },
      pisoEquivocado: { estres: 6, texto: 'Subiste al piso equivocado' },
    },
    // Pantalla final: "chances de aprobar" a partir de los stats y la hora de llegada.
    evaluacion: {
      pesoPreparacion: 0.6,
      pesoCalma: 0.25, // sobre (100 - estrés)
      pesoSeco: 0.15, // sobre (100 - mojado)
      toleranciaMinutos: 15, // después de esto, cada minuto tarde resta
      penalidadPorMinuto: 2,
      momentos: 5, // cuántos eventos del día se listan
    },
    // Frases del resumen final: para cada stat, la primera cuyo `desde` alcanza.
    veredictos: {
      estres: [
        { desde: 80, texto: 'Llegás con el corazón en la boca' },
        { desde: 50, texto: 'Llegás con los nervios de punta' },
        { desde: 0, texto: 'Llegás con una calma sorprendente' },
      ],
      mojado: [
        { desde: 60, texto: 'chorreando agua sobre la hoja del parcial' },
        { desde: 25, texto: 'con la ropa húmeda pegada al cuerpo' },
        { desde: 0, texto: 'casi seco, de milagro' },
      ],
      preparacion: [
        { desde: 60, texto: 'Pero repasaste: algo te va a salir.' },
        { desde: 35, texto: 'Y con un repaso a medias.' },
        { desde: 0, texto: 'Y sin haber repasado casi nada.' },
      ],
    },
  },

  // --- Efectos de cámara ---
  efectos: {
    // Balanceo al caminar: sube y baja una vez por paso y se mece de lado cada dos.
    balanceoPaso: { largoPaso: 0.7, altura: 0.022, lateral: 0.012, rolido: 0.0035 },
    // Temblor de la mirada con estrés 100 (rad); crece con el cuadrado del estrés.
    temblorEstres: 0.005,
    pantallaMojadaSegundos: 3.5, // lo que tardan en secarse las gotas de una salpicada
  },

  // --- Render / performance ---
  render: {
    pixelRatioMax: 2,
    sombras: true,
    // Post-procesado: viñeta, grano y los efectos de estrés/mojado en pantalla. Con false
    // (o ?calidad=baja en la URL) se dibuja directo: más liviano, sin efectos de pantalla.
    postProceso: true,
    muestrasMSAA: 4, // antialiasing del render a textura del post-procesado
    grano: 0.03,
    vineta: 0.28,
    // Reflejos del piso mojado (calle, vereda, charcos): la escena se dibuja otra vez
    // espejada, a esta fracción de la resolución de pantalla. También los apaga ?calidad=baja.
    reflejos: true,
    resolucionReflejos: 0.5,
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
    volumenRespiracion: 0.12,
  },
};
