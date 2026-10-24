/**
 * Contenido del parcial. PROVISORIO: hasta reconstruirlo a partir de las fotos del
 * parcial real (referencias/parcial/), es un parcial inventado sobre los mismos temas de
 * los apuntes (secuencia, clases y estados de un remito).
 *
 * Cada hoja es una lista de bloques, de arriba hacia abajo:
 * - { type: 'header' }: encabezado de la facultad y la materia
 * - { type: 'fields' }: renglones para nombre, legajo, curso y fecha
 * - { type: 'title', text }
 * - { type: 'text', text }: párrafo (se acomoda solo al ancho de la hoja)
 * - { type: 'exercise', number, points, text }
 * - { type: 'space', lines }: espacio en blanco para responder
 * - { type: 'footer', text }
 * La hoja de respuestas (`answerSheet`) es una hoja rayada con lo que el estudiante
 * llegó a escribir a mano.
 */
export const examInfo = {
  universidad: 'UNIVERSIDAD TECNOLÓGICA NACIONAL',
  facultad: 'Facultad Regional Córdoba',
  carrera: 'Ingeniería en Sistemas de Información',
  materia: 'Diseño de Sistemas',
  instancia: 'Primer parcial',
  aula: 'Aula 500',
};

export const examPages = [
  [
    { type: 'header' },
    { type: 'fields' },
    {
      type: 'text',
      text: 'Condiciones: sin apuntes ni celulares. Duración: hasta las 10:00 hs. Para aprobar se necesitan 60 puntos. Responder en las hojas de respuesta, indicando el número de ejercicio.',
      italic: true,
    },
    { type: 'title', text: 'Caso de estudio: Distribuidora «Del Centro»' },
    {
      type: 'text',
      text: 'La distribuidora reparte mercadería a comercios de la ciudad. Cada pedido aprobado genera un remito, que se asigna a un plan de entrega diario según la zona del cliente. El chofer registra desde el celular la entrega de cada remito; si el cliente no está, el remito queda pendiente y vuelve al depósito. Al cierre del día, los remitos pendientes se reprograman para el plan del día siguiente. Un remito puede anularse mientras no haya salido a reparto.',
    },
    {
      type: 'exercise',
      number: 1,
      points: 30,
      text: 'Construya el diagrama de secuencia del caso de uso «Generar remito», desde que el operador selecciona el pedido aprobado hasta que se imprime el remito. Incluya la interfaz, el controlador y las entidades que participan, con los mensajes y sus parámetros.',
    },
    { type: 'space', lines: 4 },
    { type: 'footer', text: 'Hoja 1 de 2 · Dar vuelta' },
  ],
  [
    {
      type: 'exercise',
      number: 2,
      points: 30,
      text: 'Diseñe el diagrama de clases para el caso de uso «Generar plan de entrega», con atributos, métodos y multiplicidades. Indique qué clase es responsable de determinar la zona de cada remito y justifique con el patrón GRASP que corresponda.',
    },
    { type: 'space', lines: 3 },
    {
      type: 'exercise',
      number: 3,
      points: 25,
      text: 'Modele con una máquina de estados el ciclo de vida del Remito: generado, asignado, en reparto, entregado, pendiente, reprogramado y anulado. Indique eventos, guardas y acciones de cada transición.',
    },
    { type: 'space', lines: 3 },
    {
      type: 'exercise',
      number: 4,
      points: 15,
      text: 'El área de ventas quiere enterarse cada vez que un remito cambia de estado, sin que el remito conozca a ventas. ¿Qué patrón de diseño aplicaría? Muestre su estructura con un diagrama de clases y explique cómo convive con el patrón State del ejercicio 3.',
    },
    { type: 'space', lines: 3 },
    { type: 'footer', text: 'Hoja 2 de 2 · Total: 100 puntos' },
  ],
];

/** Lo que el estudiante llegó a escribir en la hoja de respuestas (a mano). */
export const answerSheet = {
  nombre: '',
  lineas: [
    { text: 'Ej. 1)', bold: true },
    { text: 'Operador → :PantallaRemito : seleccionarPedido(nro)' },
    { text: ':PantallaRemito → :ControladorRemito : generarRemito(pedido)' },
    { text: ':ControladorRemito → :Pedido : getDetalles()' },
    { text: '   loop [para cada detalle]' },
    { text: '      :Pedido → :DetallePedido : getProducto()  ...' },
    { text: ':ControladorRemito → new :Remito( ' },
  ],
};
