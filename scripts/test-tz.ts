const APP_TZ = 'America/Lima';

function dayOfWeekInLima(d: Date = new Date()): number {
  const sample = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    weekday: 'short',
  }).format(d);
  const map: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return map[sample] ?? d.getUTCDay();
}

function todayLabelLima(d: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: APP_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

// Hoy 17 ago 2026, 11:04 AM Lima = 16:04 UTC
const test1 = new Date('2026-08-17T16:04:00Z');
console.log('17 ago 2026 16:04 UTC (= 11:04 Lima):');
console.log('  dayOfWeekInLima:', dayOfWeekInLima(test1), '(1=lunes)');
console.log('  todayLabelLima:', todayLabelLima(test1));
console.log('  getDay() server UTC:', test1.getUTCDay(), '(1=lunes)');
console.log('  new Date().getDay() local:', new Date(test1).getDay(), '(depende de TZ del proceso)');

// Ahora mismo (probablemente el servidor está en UTC)
const now = new Date();
console.log('\nAHORA MISMO:');
console.log('  server time UTC:', now.toISOString());
console.log('  dayOfWeekInLima:', dayOfWeekInLima(now));
console.log('  todayLabelLima:', todayLabelLima(now));
console.log('  new Date().getDay() UTC:', now.getUTCDay());

// Para confirmar: a las 23:30 Lima del 17 ago, son 04:30 UTC del 18 ago (martes)
const test2 = new Date('2026-08-18T04:30:00Z');
console.log('\n18 ago 2026 04:30 UTC (= 17 ago 23:30 Lima, todavía lunes en Lima):');
console.log('  dayOfWeekInLima:', dayOfWeekInLima(test2), '(1=lunes, pero getDay() en UTC sería 2=martes)');
console.log('  new Date().getDay() UTC:', test2.getUTCDay(), '(2=martes)');
