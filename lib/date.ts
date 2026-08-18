/** Zona horaria fija de la app: Perú (UTC-5, sin DST). */
export const APP_TZ = 'America/Lima';

/**
 * Formatea un Date como YYYY-MM-DD usando la hora LOCAL del servidor.
 * ⚠️  Solo se usa en lugares donde NO importa el día del usuario (legacy).
 *     Para "qué día es hoy" en la app, usar `todayKeyInLima`.
 */
export function localDateString(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * "Hoy" en zona horaria de la app (YYYY-MM-DD).
 * Usa Intl.DateTimeFormat con 'en-CA' para garantizar formato ISO.
 */
export function todayKeyInLima(d: Date = new Date()): string {
  // en-CA devuelve YYYY-MM-DD de forma estable
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Día de la semana en zona horaria de la app (0=domingo ... 6=sábado).
 * Igual semántica que Date.getDay(), pero respetando America/Lima.
 */
export function dayOfWeekInLima(d: Date = new Date()): number {
  const sample = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    weekday: 'short',
  }).format(d);
  // sample = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat"
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[sample] ?? d.getUTCDay();
}

/**
 * Parsea un timestamp (string ISO o Date) y devuelve YYYY-MM-DD en zona horaria Lima.
 * Para mostrar "la fecha del entrenamiento" en el portal del cliente.
 */
export function toLimaDateString(ts: string | Date): string {
  const d = typeof ts === 'string' ? new Date(ts) : ts;
  if (Number.isNaN(d.getTime())) return '';
  return todayKeyInLima(d);
}

/**
 * Formatea un Date como YYYY-MM-DDTHH:mm (formato datetime-local)
 * interpretando los componentes en zona horaria Lima (no en local del servidor).
 */
export function localDatetimeInputValueLima(d: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/** Formatea un Date como YYYY-MM-DDTHH:mm (formato datetime-local) en hora local del servidor. */
export function localDatetimeInputValue(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convierte un valor datetime-local del input a ISO (UTC) o null. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Etiqueta legible del día actual en Lima, p.ej. "lunes, 17 de agosto".
 */
export function todayLabelLima(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: APP_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

/**
 * Diferencia en DÍAS entre una fecha (YYYY-MM-DD en zona Lima) y hoy (Lima).
 * Devuelve 0 si es hoy, 1 si fue ayer, etc. Robusto contra horas UTC.
 */
export function daysAgoInLima(dateStr: string | null | undefined, refDate: Date = new Date()): number | null {
  if (!dateStr) return null;
  // dateStr está en formato YYYY-MM-DD. Comparamos contra hoy en Lima.
  const today = todayKeyInLima(refDate);
  if (dateStr === today) return 0;
  // Calcular días entre fechas (ambos YYYY-MM-DD son comparables lexicográficamente)
  const a = Date.UTC(
    parseInt(dateStr.slice(0, 4), 10),
    parseInt(dateStr.slice(5, 7), 10) - 1,
    parseInt(dateStr.slice(8, 10), 10),
  );
  const b = Date.UTC(
    parseInt(today.slice(0, 4), 10),
    parseInt(today.slice(5, 7), 10) - 1,
    parseInt(today.slice(8, 10), 10),
  );
  const diff = Math.round((b - a) / 86400000);
  return diff >= 0 ? diff : null;
}
