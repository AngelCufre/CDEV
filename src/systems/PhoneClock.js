/**
 * Hora del juego (acelerada) y celular: lleva el reloj, entrega las notificaciones
 * cuando la hora llega a la de cada una (vibración + aviso si el celular está guardado)
 * y mantiene actualizada la pantalla del celular del overlay. Compartido por las escenas
 * que tienen el celular a mano (tecla R).
 */

export function parseTime(text) {
  const [hours, minutes] = text.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = Math.floor(totalMinutes % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * - `startMinutes`: hora inicial en minutos desde las 00:00.
 * - `received`: notificaciones que ya están en el celular.
 * - `incoming`: [{ hora: 'HH:MM', de, texto }] que llegan cuando el reloj marca esa hora
 *   (las que ya pasaron al empezar se descartan).
 * - `onReceive(item)` (opcional): avisa de cada mensaje nuevo (por ejemplo, para el estrés).
 */
export function createPhoneClock({
  overlay,
  audio,
  startMinutes,
  received,
  incoming,
  secondsPerMinute,
  battery,
  onReceive = null,
}) {
  const inbox = received.map((item) => ({ ...item }));
  const pending = incoming
    .map((item) => ({ minuto: parseTime(item.hora), item: { ...item } }))
    .filter((entry) => entry.minuto > startMinutes)
    .sort((a, b) => a.minuto - b.minuto);

  let elapsed = 0;
  let lastShownTime = '';

  overlay.setPhoneBattery(battery);
  overlay.setPhoneNotifications(inbox);

  function currentMinutes() {
    return startMinutes + elapsed / secondsPerMinute;
  }

  function receive(item) {
    inbox.push(item);
    overlay.setPhoneNotifications(inbox);
    audio.playVibration();
    if (!overlay.isPhoneVisible) {
      overlay.showToast(`📳 ${item.de}: nuevo mensaje · [R] ver celular`);
    }
    onReceive?.(item);
  }

  function refresh() {
    const minutes = currentMinutes();
    const text = formatTime(minutes);
    if (text !== lastShownTime) {
      lastShownTime = text;
      overlay.setPhoneTime(text);
    }
    while (pending.length > 0 && pending[0].minuto <= minutes) {
      receive(pending.shift().item);
    }
  }
  refresh();

  return {
    update(delta) {
      elapsed += delta;
      refresh();
    },
    get minutes() {
      return currentMinutes();
    },
    /** Llega un mensaje ya mismo (no atado a una hora fija), con la hora actual. */
    deliver({ de, texto }) {
      receive({ hora: formatTime(currentMinutes()), de, texto });
    },
    /** Copia de lo que hay en el celular (para pasarlo a la escena siguiente). */
    get notifications() {
      return inbox.map((item) => ({ ...item }));
    },
  };
}
