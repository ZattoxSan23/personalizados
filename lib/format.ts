/**
 * Helpers de formato compartidos entre trainer y portal del cliente.
 * Usar estas funciones en lugar de formatear inline para mantener
 * consistencia visual.
 */

/**
 * Formatea una cantidad de segundos en m:ss o h:mm:ss.
 *
 * @example
 *   formatSeconds(45)   === '0:45'
 *   formatSeconds(90)   === '1:30'
 *   formatSeconds(125)  === '2:05'
 *   formatSeconds(3600) === '1:00:00'
 *   formatSeconds(7325) === '2:02:05'
 */
export function formatSeconds(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0:00';
  const sec = Math.round(totalSeconds);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Versión corta: si la duración es múltiplo limpio de 60, devuelve en minutos
 * ('5 min'), si no, en m:ss ('2:30'). Útil para resúmenes donde el formato
 * legible importa más que la precisión exacta.
 */
export function formatDurationShort(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '—';
  const sec = Math.round(totalSeconds);
  if (sec >= 60 && sec % 60 === 0) {
    return `${sec / 60} min`;
  }
  return formatSeconds(sec);
}