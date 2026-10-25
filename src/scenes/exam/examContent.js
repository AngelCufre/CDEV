/**
 * Contenido del parcial, reconstruido a partir de dos parciales reales de Diseño de
 * Sistemas (UTN FRC, 2024) sin lo escrito a mano: nombres, legajos, notas, correcciones
 * ni subrayados. La primera hoja es la teórica (Tema D del primer parcial teórico) y el
 * resto es la parte práctica (vistas arquitectónicas sobre el dominio "Cajas de
 * seguridad robotizadas"). Cambios respecto de los originales: la parte práctica se
 * titula también "Primer parcial", las fechas y el nombre de la docente quedan en blanco.
 *
 * La parte práctica es un flujo de bloques que examPages.js reparte solo en hojas:
 * - { type: 'heading', text }: título de sección grande (en cursiva)
 * - { type: 'section', text }: subtítulo en negrita
 * - { type: 'paragraph', text }
 * - { type: 'bullets', items }
 * - { type: 'table', columns: [{ title, width }], rows: [[celdas]], firstColumnDark? }
 */

export const examInfo = {
  universidad: 'Universidad Tecnológica Nacional',
  facultad: 'Facultad Regional Córdoba',
  carrera: 'Ing. en Sistemas de Información',
  catedra: ['Cátedra Diseño de', 'Sistemas de Información'],
  ciclo: 'Ciclo lectivo 2024',
  turnos: 'Turnos: Todos',
};

export const theoryPage = {
  titulo: 'PRIMER PARCIAL TEÓRICO',
  subtitulo: 'Diseño de Sistemas – 3K5',
  resultados: [
    'Aplicar los fundamentos del paradigma de orientación a objetos para construir modelos de software en el contexto del análisis y el diseño de sistemas de información.',
    'Construir modelos de análisis y diseño de sistemas de información, utilizando UML 2.0 (lenguaje de modelado unificado), durante el proceso de desarrollo de sistemas de información.',
  ],
  tema: 'TEMA D',
  aviso: 'LA INTERPRETACIÓN DE LA CONSIGNA ES PARTE DE LO QUE SE EVALÚA',
  valor: '(valor de cada respuesta 10 puntos)',
  preguntas: [
    '¿Qué significan los conceptos: "dominio del problema" y "dominio de la solución"? Relacione estos conceptos con las diferencias entre los modelos resultantes del análisis y los requerimientos.',
    '¿Cuál es la utilidad de los patrones GRASP? Explique el propósito y desarrolle un ejemplo PROPIO en el que use el patrón ALTA COHESIÓN y un ejemplo en el que no lo use.',
    'Explique los tres tipos de clases que se utilizan para modelar en el análisis y ejemplifíquelas, utilizando un caso propio con el o los diagramas de UML que considere adecuados.',
  ],
};

export const practicalPart = {
  titulo: 'PRIMER PARCIAL',
  intro:
    'Se pide al Estudiante que lea y analice atentamente la situación planteada y en base a ello desarrolle las siguientes vistas arquitectónicas:',
  consignas: [
    {
      titulo: 'Vista Arquitectónica de la Funcionalidad.',
      texto:
        'Utilizando un diagrama de casos de uso. Justificar la elección de los casos de uso que incluya en la vista. Para construir esta vista elija los casos de uso que considere en función de los definidos en la lista de casos de uso que tiene disponible.',
      puntaje: 15,
    },
    {
      titulo: 'Vista Arquitectónica del Diseño.',
      texto:
        'Utilizando un diagrama de componentes para modelar los subsistemas, componentes e interfaces relevantes.',
      puntaje: 30,
    },
    {
      titulo: 'Vista Arquitectónica del Despliegue – Nodos y Subsistemas.',
      texto:
        'Utilizando un diagrama de despliegue para modelar la distribución del software (subsistemas y componentes) en los niveles de hardware.',
      puntaje: 15,
    },
  ],
  bloques: [
    { type: 'heading', text: 'Dominio: Cajas de seguridad robotizadas' },
    { type: 'section', text: 'Glosario' },
    {
      type: 'table',
      firstColumnDark: true,
      columns: [
        { title: 'Concepto', width: 0.2 },
        { title: 'Definición', width: 0.8 },
      ],
      rows: [
        [
          'Caja de seguridad',
          'Es un contenedor seguro, que se alquila, y que se utiliza para guardar artículos importantes como documentos, joyas y otros objetos de valor. Estas cajas están diseñadas para ofrecer protección contra robos y desastres.',
        ],
        [
          'Brazo robótico',
          'Es un tipo de mecanismo mecánico programable que simula las funciones de un brazo humano. Se utilizan en diversas aplicaciones industriales y pueden ser diseñados para realizar tareas específicas, desde ensamblaje hasta manipulación de materiales.',
        ],
        [
          'Bóveda',
          'Es una construcción arquitectónica segura utilizada para guardar las cajas de seguridad y cuyo objetivo es proteger su contenido contra el robo, uso no autorizado, incendios, desastres naturales y otras amenazas.',
        ],
        [
          'Datos biométricos',
          'Información personal que se refiere a características físicas o de comportamiento únicas de un individuo, utilizadas para su identificación o reconocimiento. Ejemplos incluyen huellas dactilares, reconocimiento facial, lectura de iris.',
        ],
        [
          'Reconocimiento facial',
          'Es un método que identifica o verifica la identidad de una persona mediante su rostro.',
        ],
        [
          'Identificación por huellas dactilares',
          'Es el proceso de verificación de la identidad de una persona mediante la comparación de sus huellas dactilares.',
        ],
        [
          'Lectura de iris',
          'Es un método que identifica o verifica la identidad de una persona mediante los patrones únicos dentro de una región en forma de anillo que rodea la pupila de cada ojo.',
        ],
        [
          'Puertas esclusas',
          'Las puertas esclusas son estructuras formadas por una combinación de dos puertas, diseñadas para aislar áreas específicas y controlar las características ambientales que deben mantenerse bajo control. Su funcionamiento está controlado por un sistema automatizado que evita que ambas puertas se abran simultáneamente, lo cual es crucial para la seguridad y efectividad del sistema.',
        ],
        [
          'Apertura forzada',
          'Acto de abrir una caja de seguridad sin el consentimiento o la presencia del titular, generalmente por falta de pago, cumplimiento de las condiciones acordadas o fallecimiento, siguiendo un procedimiento legal que puede incluir la notificación al cliente y la intervención de un escribano público.',
        ],
        [
          'Servicios de i18next',
          'I18n significa internacionalización (18 son las letras que hay entre la I y la N). El proceso de diseñar y construir un producto de manera que sea compatible con cualquier cultura o idioma específico. La internacionalización facilita la localización de un producto para audiencias objetivo-específicas sin tener que ajustar la base de código para cada una de esas audiencias. I18next e I18nextV4 son bibliotecas JavaScript que proporcionan soluciones de localización e internacionalización fáciles de usar.',
        ],
        [
          'Algoritmo Twofish',
          'Twofish es un método de criptografía simétrica con cifrado por bloques desarrollado por Counterpane Labs. El tamaño de bloque en Twofish es de 128 bits y el tamaño de clave puede llegar hasta 256 bits. No patentado, de uso gratuito y útil tanto para hardware como software, Twofish es conocido como uno de los algoritmos más rápidos en la actualidad.',
        ],
      ],
    },
    { type: 'heading', text: 'Descripción del Dominio' },
    {
      type: 'paragraph',
      text: 'Una empresa líder en el mercado que ofrece el alquiler de cajas de seguridad desea incorporar a sus servicios las cajas de seguridad robotizadas. Para dar respaldo a este servicio ha contratado a nuestra consultora para el desarrollo de un software que gestione las cajas de seguridad. Estas cajas de seguridad difieren a las tradicionales, en que no necesitan la asistencia de una persona de la empresa para operar, sino que, se trata de un sistema que cuenta con una bóveda donde se almacenan las cajas de seguridad y un despacho con una terminal de operación para el Cliente. Dentro de la bóveda hay un brazo robótico que gestiona la caja de seguridad, recibiendo el número de la caja de seguridad que indica su ubicación dentro de la bóveda.',
    },
    { type: 'section', text: 'Estructura de las Bóvedas' },
    {
      type: 'paragraph',
      text: 'El lugar físico de las bóvedas, están disponibles en lugares no tradicionales, como Centros Comerciales o edificios de oficinas, lo que le ofrece al Cliente que el ingreso y egreso pase desapercibido. Además, permite brindar un servicio 24/7, es decir, las 24 hs. los 365 días del año.',
    },
    {
      type: 'paragraph',
      text: 'Cada bóveda se organiza en corredores, y cada corredor se divide en celdas de diferentes tamaños para albergar las cajas de seguridad. Cada celda (ubicación) dentro de la bóveda se identifica con una letra y luego dos números de dos dígitos cada uno, donde el primer número corresponde a la columna y el segundo a la fila, y esto conforma la identificación de una caja de seguridad. Por ejemplo, la caja de seguridad B0576 corresponde a la ubicación: corredor B, columna 05, fila 76. La cantidad de columnas y filas de cada corredor depende del tamaño de las cajas de seguridad que guarda y las dimensiones del lugar.',
    },
    { type: 'section', text: 'Cajas de seguridad' },
    {
      type: 'paragraph',
      text: 'La empresa ofrece 4 tipos de caja de seguridad clasificadas en función a su tamaño, siendo que cada una tiene un precio diferenciado.',
    },
    {
      type: 'paragraph',
      text: 'El Cliente debe utilizar la llave de la caja de seguridad, que se le entrega al contratar el servicio, para abrirla una vez que el brazo robótico se la ha entregado. Aun cuando en el contrato de la caja de seguridad requiera acceso concurrente de más de una persona, solo se necesita una llave. La llave de la caja de seguridad es lo único que es igual para todas las personas con acceso a la misma. Si el cliente perdiera sus llaves, deberá informar de inmediato a la Empresa, quien procederá al cambio de estas, en presencia del cliente y los costos de reposición correrán por su cuenta. En cuanto a la seguridad, no hay riesgos, ya que es imposible que cualquier persona ingrese a la bóveda solo con las llaves. La Empresa no solicita información sobre el contenido de las cajas de seguridad. Aunque en la contratación la Empresa deja claro que no se pueden guardar sustancias prohibidas y cualquier otra cosa cuya posesión o uso esté prohibido por la legislación vigente. Tampoco se permite guardar armas de cualquier tipo (blancas y de fuego) aún en el caso que se tengan los permisos correspondientes.',
    },
    { type: 'section', text: 'Titulares y Personas autorizadas' },
    {
      type: 'paragraph',
      text: 'Para contratar el servicio de una caja de seguridad el Cliente debe firmar un contrato con la Empresa, dónde se especifica la o las personas titulares y las autorizadas. Por cada caja de seguridad pueden operar hasta 4 personas, y estas deben ser titulares y/o autorizadas. Es decir, son ellas las únicas personas que pueden tener acceso a la caja de seguridad. Las personas titulares son las que firman el contrato con la empresa, y por ende las que aceptan los derechos y obligaciones expuestos en el mismo. Las personas autorizadas figuran en el contrato, pero no lo firman. Se confecciona un contrato para cada caja de seguridad que desea contratar un cliente y en ese contrato se asocia un número de PIN que será requerido cada vez que desee acceder. En el contrato se especifica también si el acceso es indistinto para cada una de las personas, ya sean titulares o autorizadas, o si se requiere concurrencia, esto es, para acceder a la extracción de la caja de seguridad, se deben autenticar 2 o más personas, si esto no se cumple no se puede acceder a la caja de seguridad. Se entrega para cada persona con acceso a la caja de seguridad, una llave de acceso.',
    },
    {
      type: 'paragraph',
      text: 'La contratación de la caja de seguridad incluye un seguro de 50.000 dólares y el cliente puede aumentarlo hasta 300.000 dólares. Todos los contratos que se firman son anuales. Diez (10) días antes del vencimiento del contrato se les envía a las personas titulares una notificación por e-mail, para que se presente a firmar la renovación del contrato. Si el contrato no se renueva, a las 00 hs del día posterior al vencimiento, se da de baja automáticamente.',
    },
    {
      type: 'paragraph',
      text: 'Luego de la firma del contrato a cada una de las personas con acceso a la caja de seguridad se le toman los datos biométricos y se le entregan las llaves de la caja de seguridad. Un empleado de la Empresa, luego, a través de un recorrido, les muestra como es la seguridad para el acceso a la caja de seguridad y le muestra cómo interactuar con la consola del despacho. En ese momento se le pide a cada persona que genere su clave de acceso personal (PIN).',
    },
    { type: 'section', text: 'Acceso a las cajas de seguridad' },
    {
      type: 'paragraph',
      text: 'Para poder llegar al despacho donde se entrega la caja de seguridad, el Cliente debe pasar por ciertos anillos de seguridad. Ante cualquier falla en la autenticación del Cliente cruzando cualquiera de los anillos de seguridad, se le restringe el acceso y se le habilita una salida. El primer anillo de seguridad que debe atravesar un Cliente, son las puertas esclusas. Para ello se le pide la autenticación mediante el reconocimiento facial. Una vez cruzadas las puertas esclusas se le pide al Cliente para abrir la puerta del despacho, otro dato biométrico, en este caso el lector de iris del ojo realiza la autenticación. La puerta del despacho se abre y se accede a un despacho que contiene el soporte donde se entregará la caja de seguridad y una consola. Para el caso de acceso concurrente, es en este último despacho donde se encuentra la consola, se pide ingrese su número de documento único (DNI) y el PIN (número de identificación personal) de cada una de las personas autorizadas para el acceso concurrente a la caja de seguridad.',
    },
    {
      type: 'paragraph',
      text: 'Una vez validados los accesos, el sistema proporciona al brazo robótico el número de caja de seguridad del Cliente para extraerlo de la bóveda. El número de caja de seguridad indica, además, la ubicación de la caja de seguridad dentro de la bóveda. Con esta información el brazo robótico se dirige a la ubicación indicada, extrae la caja de seguridad y la lleva hacia el compartimento al que tiene acceso el Cliente. Para abrir la caja de seguridad, solo es necesaria una de las llaves, aunque el acceso sea concurrente, es decir que ingrese al compartimento más de una persona al mismo tiempo. Cuando el cliente lo indique, es decir, cuando se deja la caja de seguridad en el compartimento nuevamente, este se cierra y el brazo robótico volverá a ubicar en su lugar la caja de seguridad.',
    },
    { type: 'heading', text: 'Definición del Producto de Software a construir:' },
    { type: 'section', text: 'Objetivo del Producto de Software:' },
    {
      type: 'paragraph',
      text: 'Gestionar clientes que contratan servicios de alquiler de cajas de seguridad como así también, gestionar y controlar acceso a las cajas de seguridad robotizadas de quién estén autorizados.',
    },
    { type: 'section', text: 'Alcances del producto de software:' },
    {
      type: 'bullets',
      items: [
        'Administración de tipos de Cajas de Seguridad.',
        'Administración de Cajas de Seguridad.',
        'Gestión de contratos de alquiler de cajas de seguridad.',
        'Gestión de Clientes.',
        'Gestión de accesos a las Cajas de Seguridad.',
      ],
    },
    { type: 'section', text: 'No contempla:' },
    { type: 'bullets', items: ['Gestión de Cobros', 'Gestión de Turnos'] },
    { type: 'heading', text: 'Casos de Uso' },
    {
      type: 'paragraph',
      italic: true,
      text: 'Nota: Si bien el listado de casos de uso no es exhaustivo, los casos de uso incluidos para una mejor comprensión de la funcionalidad del producto son suficientes para construir la vista arquitectónica de la funcionalidad.',
    },
    {
      type: 'table',
      small: true,
      columns: [
        { title: 'Nro.', width: 0.06 },
        { title: 'Nombre CU', width: 0.22 },
        { title: 'Objetivo CU', width: 0.46 },
        { title: 'Actores', width: 0.26 },
      ],
      rows: [
        [
          '1',
          'Registrar usuario desktop',
          'Registrar un usuario del sistema para que ingrese a las funciones de Administración de la Empresa',
          'AP: Usuario',
        ],
        [
          '2',
          'Modificar usuario desktop',
          'Modificar los datos permitidos de un usuario desktop',
          'AP: Usuario',
        ],
        ['3', 'Eliminar usuario desktop', 'Dar de baja un usuario desktop', 'AP: Usuario'],
        [
          '4',
          'Consultar usuario desktop',
          'Visualizar los datos de un usuario desktop',
          'AP: Usuario',
        ],
        [
          '5',
          'Iniciar sesión',
          'Registrar el inicio de una sesión por parte de un usuario registrado en el sistema, validando su password y permisos.',
          'AP: Usuario',
        ],
        ['6', 'Cerrar sesión', 'Cerrar la sesión actual del usuario en el sistema.', 'AP: Usuario'],
        [
          '7',
          'Registrar tipo caja de seguridad',
          'Registrar el nombre y tamaño del tipo de caja de seguridad, con sus medidas y precio asociado.',
          'AP: Parametrizador del Sistema',
        ],
        [
          '8',
          'Modificar tipo caja de seguridad',
          'Modificar los datos permitidos de un tipo de caja de seguridad',
          'AP: Parametrizador del Sistema',
        ],
        [
          '9',
          'Eliminar tipo caja de seguridad',
          'Dar de baja un tipo de caja de seguridad',
          'AP: Parametrizador del Sistema',
        ],
        [
          '10',
          'Consultar tipo caja de seguridad',
          'Visualizar los datos de un tipo de caja de seguridad',
          'AP: Parametrizador del Sistema',
        ],
        [
          '11',
          'Registrar Cliente',
          'Registrar los datos de toda persona que tendrá acceso a la caja de seguridad, según un contrato firmado.',
          'AP: Administrador de la Empresa',
        ],
        [
          '12',
          'Modificar Cliente',
          'Modificar los datos permitidos de un Cliente',
          'AP: Administrador de la Empresa',
        ],
        ['13', 'Eliminar Cliente', 'Dar de baja un Cliente.', 'AP: Administrador de la Empresa'],
        [
          '14',
          'Consultar Cliente',
          'Visualizar los datos de un Cliente.',
          'AP: Administrador de la Empresa',
        ],
        [
          '15',
          'Validar acceso de Cliente',
          'Validar permisos de acceso de un Cliente a través de los anillos de seguridad para llegar a la zona de despacho de la caja de seguridad.',
          'AP: Cliente\nAS: Hardware controlador puertas\nAS: Dispositivo lector facial\nAS: Dispositivo lector huella\nAS: Dispositivo lector Iris',
        ],
        [
          '16',
          'Registrar estructura bóveda',
          'Registrar una nueva bóveda ingresando el número y Sucursal de esta, indicando la cantidad de corredores y celdas y para cada corredor se le asigna una letra y para cada celda un número de dos dígitos que corresponde a la columna seguido de otro número de dos dígitos que corresponde a la fila del corredor en la que se encuentra.',
          'AP: Parametrizador del Sistema',
        ],
        [
          '17',
          'Generar números de cajas de seguridad',
          'Asignar a cada caja de seguridad una ubicación en la bóveda dependiendo del tipo de caja, se asigna a la caja el mismo número que corresponde a la celda en la que se ubica',
          'AP: Parametrizador del Sistema',
        ],
        [
          '18',
          'Seleccionar idioma de consola',
          'Seleccionar el idioma de la consola que gestiona el pedido de la caja de seguridad.',
          'AP: Cliente',
        ],
        [
          '19',
          'Registrar acceso a caja de seguridad',
          'Se registra la fecha y la hora de extracción y los Clientes que accedieron a una caja de seguridad. Este caso de uso incluye el caso de uso 21. Extraer caja de seguridad.',
          'AP: Cliente',
        ],
        [
          '20',
          'Registrar devolución de caja de seguridad',
          'Se registra la fecha y la hora de devolución de la caja de seguridad. Este caso de uso incluye al caso de uso 22. Guardar caja de seguridad.',
          'AP: Cliente',
        ],
        [
          '21',
          'Extraer caja de seguridad',
          'El sistema recibe el número de caja de seguridad y pasa la información al brazo robótico que busca en la bóveda la caja de seguridad y la entrega en el despacho.',
          'AP: Hardware Controlador Brazo Robot',
        ],
        [
          '22',
          'Guardar caja de seguridad',
          'El sistema recibe el número de caja de seguridad del Cliente y pasa la información al brazo robótico que coloca en la ubicación correspondiente en la bóveda la caja de seguridad',
          'AP: Hardware Controlador Brazo Robot',
        ],
        [
          '23',
          'Registrar Contrato',
          'Registrar los datos del contrato firmado entre la Empresa y los titulares de la caja de seguridad. Se registran las personas que tendrán acceso, así como el tipo de acceso requerido (simple o concurrente).',
          'AP: Administrador de la Empresa',
        ],
        [
          '24',
          'Modificar Contrato',
          'Modificar los datos permitidos de un contrato.',
          'AP: Administrador de la Empresa',
        ],
        [
          '25',
          'Eliminar Contrato',
          'Dar de baja un Contrato que no ha sido renovado',
          'AP: Administrador de la Empresa',
        ],
        [
          '26',
          'Consultar Contrato',
          'Visualizar los datos de un contrato',
          'AP: Administrador de la Empresa',
        ],
        [
          '27',
          'Verificar vencimiento de contratos',
          'Verificar automáticamente la fecha de caducidad de los contratos para identificar aquellos contratos que se darán de baja porque no fueron renovados.',
          '',
        ],
        [
          '28',
          'Notificar vencimiento contrato',
          'Verificar automáticamente la fecha de caducidad de los contratos para notificar al Cliente por email del próximo vencimiento del contrato.',
          'AS: Servidor de Correo',
        ],
        [
          '29',
          'Renovar Contrato',
          'Registrar la nueva fecha de caducidad de un contrato con las mismas condiciones pautadas.',
          'AP: Administrador de la Empresa',
        ],
      ],
    },
    { type: 'heading', text: 'Requerimientos No Funcionales significativos para la arquitectura:' },
    {
      type: 'table',
      small: true,
      columns: [
        { title: 'Nro.', width: 0.06 },
        { title: 'Nombre', width: 0.18 },
        { title: 'Descripción', width: 0.34 },
        { title: 'Justificación', width: 0.42 },
      ],
      rows: [
        [
          '1.',
          'Seguridad de acceso mediante datos biométricos',
          'El sistema debe poder gestionar el acceso a las cajas de seguridad, a través de diferentes anillos de seguridad:\n1. reconocimiento facial.\n2. lector de Iris.\n3. ingreso huella dactilar',
          'Se debe desarrollar para cada anillo de seguridad un componente de software que tome los datos del dispositivo biométrico, los interprete y permita validar el Cliente para permitir el acceso. Se puede aplicar un patrón bróker.',
        ],
        [
          '2.',
          'Conexión con el hardware de puertas esclusas y de acceso al despacho',
          'El sistema necesita una conexión con el hardware de las puertas para poder abrir y cerrarlas luego de la validación del Cliente.',
          'Debe desarrollarse un componente que interactúe con cada uno de los drivers de las puertas esclusas y de acceso al despacho.',
        ],
        [
          '3.',
          'Idioma de la consola',
          'La consola permite elegir el idioma de comunicación',
          'Se deberá integrar la librería que utilizará los servicios de i18next para que el usuario pueda visualizar las opciones en el idioma seleccionado.',
        ],
        [
          '4.',
          'Comunicación con Robot de bóveda',
          'El sistema debe permitir la comunicación con un brazo robótico que a partir de darle como datos de entrada un número de caja de seguridad del Cliente pueda interpretar la instrucción para extraer la caja de seguridad de la bóveda, y luego pueda volver a depositarla en su lugar cuando el usuario lo solicita.',
          'Debe desarrollarse un componente que se comunique con el controlador del robot que procesa la información captada de los sensores en los brazos, y que según las instrucciones del programa que almacena regula el movimiento de los motores para extraer y devolver las cajas en el compartimento de la bóveda.',
        ],
        [
          '5.',
          'Tecnología desktop',
          'El módulo de administración general del sistema de información deberá poder de ejecutarse en las computadoras de la empresa, con sistema operativo Windows. La consola de Despacho también debe funcionar con el mismo sistema operativo Windows.',
          'Las funcionalidades relacionadas a la administración del sistema deben desarrollarse con un lenguaje de programación que sea compatible con sistema Windows, que será ejecutado en las computadoras de la empresa y la consola que interactúa con el Cliente.',
        ],
        [
          '6.',
          'Notificación email',
          'El sistema debe enviar notificaciones a las personas titulares de la caja de seguridad del vencimiento y baja del contrato, si corresponde.',
          'Requerimiento de interfaz de software que implica el desarrollo de una interfaz mediante servicios para la conexión con un servidor de correo electrónico. Para hacer el envío de mail se utilizará el servidor de correo Mailgun compatible con aplicaciones de escritorio (Windows).',
        ],
        [
          '7.',
          'Comunicación encriptada',
          'Los datos que establecen la comunicación entre los dispositivos biométricos y el servidor deben ser considerados confidenciales, por lo que debe encriptarse.',
          'Se requiere que el sistema integre la librería que utiliza el algoritmo Twofish para asegurar la confidencialidad de los datos.',
        ],
        [
          '8.',
          'Disponibilidad',
          'Debido a que el servicio es de 7*24 hs, se requiere asegurar alta disponibilidad de los datos de la aplicación, es decir 7x24x365.',
          'Deben espejarse las bases de datos (Database Mirroring), utilizando 2 servidores diferentes para alojar cada una de las bases de datos para asegurar que, ante la caída eventual de uno de ellos, el otro pueda brindar el servicio.',
        ],
        [
          '9.',
          'Seguridad de usuarios',
          'El sistema debe permitir la administración de usuarios y permisos',
          'Requerimiento de seguridad lógica, significativo para la arquitectura, implica desarrollar un módulo que permita autenticar usuarios y controlar las sesiones para los módulos de administración y turnos.',
        ],
      ],
    },
  ],
};

/**
 * Lo que el estudiante llegó a escribir en la hoja de respuestas, con su letra: empezó
 * por la parte teórica y no llegó a terminar.
 */
export const answerSheet = {
  lineas: [
    { text: '1) Dominio del problema: la parte del mundo real donde', bold: false },
    { text: '   está la necesidad (el negocio, sus reglas y actores).' },
    { text: '   Dominio de la solución: el software que se construye' },
    { text: '   para resolverla. En el análisis modelo el problema' },
    { text: '   (clases de entidad, sin tecnología) y en el diseño...' },
    { text: '' },
    { text: '2) GRASP: patrones para asignar responsabilidades a las' },
    { text: '   clases. Alta cohesión → cada clase hace pocas cosas' },
    { text: '   y relacionadas. Ej. PROPIO: ' },
  ],
  tachado: 'Ej: GestorCaja',
};
