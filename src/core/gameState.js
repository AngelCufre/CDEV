/**
 * Estado que pasa de una escena a la siguiente: la hora del juego y lo que ya llegó
 * al celular. Si una escena se abre directo (por ejemplo con ?escena=colectivo), los
 * valores quedan en null y la escena usa los de config.js.
 */
export const gameState = {
  clockMinutes: null, // minutos desde las 00:00
  phoneNotifications: null, // [{ de, texto, hora? }]
  arrivalMinutes: null, // hora a la que llegó al aula (para el resumen del día)
};
