import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  progressEntries, routines, routineDays, routineExercises, exercises,
  clients,
} from '@/lib/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';
import {
  TrendingDown, TrendingUp, Scale, Ruler, Activity, Flame,
  Sparkles, Dumbbell, Target, Trophy, Calendar, Lightbulb, Eye, ChevronDown,
  ChevronUp, Heart,
} from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';
import ExerciseAnalysis from '@/app/components/ExerciseAnalysis';
import HumanBodySVG, {
  type MuscleDatum, type MuscleKey, type MuscleTrend,
} from '@/app/components/HumanBodySVG';
import EvolucionTabs, { type MetricaTab } from './EvolucionTabs';
import { todayKeyInLima } from '@/lib/date';
import {
  calcBodyComposition,
  CATEGORY_LABELS,
  WHR_RISK_LABELS,
  ageFromBirthDate,
  type Gender,
} from '@/lib/us-navy';

export const dynamic = 'force-dynamic';

const NUM = (v: string | null | undefined): number | null =>
  v == null ? null : Number(v);

// ============================================================
// Mensajes narrativos — lenguaje de gym, no de laboratorio
// ============================================================

function pesoMensaje(delta: number | null): string {
  if (delta == null) return 'Pídele a tu coach que registre tu peso este mes para ver cómo vas.';
  if (delta < -2) return `¡Bajaste ${Math.abs(delta).toFixed(1)} kg! Tu cuerpo está respondiendo. Mantén el plan.`;
  if (delta < -1) return `Bajaste ${Math.abs(delta).toFixed(1)} kg. Buen ritmo, sigamos así.`;
  if (delta < -0.5) return `Bajaste ${Math.abs(delta).toFixed(1)} kg. Movimiento lento pero a favor.`;
  if (Math.abs(delta) < 0.5) return 'Tu peso se mantuvo estable. Si estás trabajando fuerza, es buena señal.';
  if (delta < 1.5) return `Subiste ${delta.toFixed(1)} kg. Si es músculo, excelente.`;
  return `Subiste ${delta.toFixed(1)} kg. Si es músculo, sigue así; si no, ajustemos el plan.`;
}

function grasaMensaje(delta: number | null): string {
  if (delta == null) return 'Pídele a tu coach que mida cuello y cintura para calcular tu grasa.';
  if (delta < -2) return `¡${Math.abs(delta).toFixed(1)}% menos grasa! Tu esfuerzo se nota.`;
  if (delta < -1) return `Bajaste ${Math.abs(delta).toFixed(1)}% de grasa. Vas bien.`;
  if (delta < -0.5) return `${Math.abs(delta).toFixed(1)}% menos grasa. Pequeño gran paso.`;
  if (Math.abs(delta) < 0.5) return 'Tu grasa está estable este mes.';
  return `Subió ${delta.toFixed(1)}%. Momento de ajustar: hablemos con tu coach.`;
}

function cinturaMensaje(delta: number | null): string {
  if (delta == null) return 'Necesitamos tu medida de cintura para ver tu progreso.';
  if (delta < -2) return `¡Cintura -${Math.abs(delta).toFixed(1)} cm! Tu silueta cambió.`;
  if (delta < -1) return `Cintura -${Math.abs(delta).toFixed(1)} cm. Vas bien.`;
  if (delta < -0.5) return `Cintura -${Math.abs(delta).toFixed(1)} cm.`;
  if (Math.abs(delta) < 0.5) return 'Cintura estable este mes.';
  return `Cintura +${delta.toFixed(1)} cm. Revisemos el plan.`;
}

function cmMensaje(delta: number | null, name: string, isDown: boolean): string {
  if (delta == null) return `Pídele a tu coach que registre ${name} en tu próxima medición.`;
  if (delta > 0.5 && !isDown) return `¡${name} +${delta.toFixed(1)} cm! Ganaste volumen.`;
  if (delta > 0 && !isDown) return `${name} +${delta.toFixed(1)} cm.`;
  if (delta < -0.5 && isDown) return `¡${name} -${Math.abs(delta).toFixed(1)} cm! Buen cambio.`;
  if (delta < 0 && isDown) return `${name} -${Math.abs(delta).toFixed(1)} cm.`;
  if (Math.abs(delta) < 0.5) return `${name} estable este mes.`;
  return `${name}: cambio de ${delta > 0 ? '+' : ''}${delta.toFixed(1)} cm.`;
}

// ============================================================
// Insights principales del mes
// ============================================================

interface Insight {
  key: string;
  icon: typeof Scale;
  titulo: string;
  /** Numero grande formateado (ej: "-2.3 kg"). */
  numero: string;
  /** Color del numero: verde (mejora), azul (bajo es mejor), gris (neutro). */
  color: 'success' | 'accent' | 'ink';
  frase: string;
}

interface InsightInputs {
  weightDelta: number | null;
  bfDelta: number | null;
  waistDelta: number | null;
  chestDelta: number | null;
  bicepDelta: number | null;
  shoulderDelta: number | null;
  thighDelta: number | null;
  measurementsCount: number;
  sessionsCount: number;
}

function computeInsights(i: InsightInputs): Insight[] {
  const out: Insight[] = [];
  // Prioridad 1: % grasa (bajar es ganar salud)
  if (i.bfDelta != null && Math.abs(i.bfDelta) >= 0.5) {
    const mejor = i.bfDelta < 0;
    out.push({
      key: 'bf',
      icon: Flame,
      titulo: 'Tu grasa corporal',
      numero: mejor ? `${i.bfDelta.toFixed(1)}%` : `+${i.bfDelta.toFixed(1)}%`,
      color: mejor ? 'success' : 'accent',
      frase: grasaMensaje(i.bfDelta),
    });
  }
  // Prioridad 2: cintura
  if (i.waistDelta != null && Math.abs(i.waistDelta) >= 0.5) {
    const mejor = i.waistDelta < 0;
    out.push({
      key: 'waist',
      icon: Ruler,
      titulo: 'Tu cintura',
      numero: mejor ? `${i.waistDelta.toFixed(1)} cm` : `+${i.waistDelta.toFixed(1)} cm`,
      color: mejor ? 'success' : 'accent',
      frase: cinturaMensaje(i.waistDelta),
    });
  }
  // Prioridad 3: peso
  if (i.weightDelta != null && Math.abs(i.weightDelta) >= 0.5 && out.length < 3) {
    out.push({
      key: 'weight',
      icon: Scale,
      titulo: 'Tu peso',
      numero: i.weightDelta < 0
        ? `${i.weightDelta.toFixed(1)} kg`
        : `+${i.weightDelta.toFixed(1)} kg`,
      color: i.weightDelta < 0 ? 'success' : 'ink',
      frase: pesoMensaje(i.weightDelta),
    });
  }
  // Ganancia muscular (pecho o bíceps)
  const musculoGanancia = (i.chestDelta != null && i.chestDelta >= 0.5)
    || (i.bicepDelta != null && i.bicepDelta >= 0.5);
  if (musculoGanancia && out.length < 3) {
    const cm = Math.max(i.chestDelta ?? 0, i.bicepDelta ?? 0);
    out.push({
      key: 'muscle',
      icon: Trophy,
      titulo: 'Músculo ganado',
      numero: `+${cm.toFixed(1)} cm`,
      color: 'success',
      frase: 'Tu cuerpo está sumando masa muscular donde importa. Sigue entrenando fuerte.',
    });
  }
  // Si no hay nada destacado, tarjeta neutral
  if (out.length === 0) {
    out.push({
      key: 'base',
      icon: Activity,
      titulo: 'Mes de base',
      numero: '—',
      color: 'ink',
      frase: 'Tu cuerpo se está adaptando al plan. Las primeras mediciones son tu línea de partida; el progreso llega con constancia.',
    });
  }
  // Limitar a 3
  return out.slice(0, 3);
}

// ============================================================
// Frase destacada del hero
// ============================================================

function buildHeroHeadline(i: InsightInputs): string {
  const has = (d: number | null) => d != null && Math.abs(d) >= 0.5;
  const bfDown = has(i.bfDelta) && (i.bfDelta ?? 0) < 0;
  const waistDown = has(i.waistDelta) && (i.waistDelta ?? 0) < 0;
  const weightDown = has(i.weightDelta) && (i.weightDelta ?? 0) < 0;

  if (bfDown && waistDown) {
    const bf = Math.abs(i.bfDelta!).toFixed(1);
    const w = Math.abs(i.waistDelta!).toFixed(1);
    return `¡Bajaste ${bf}% de grasa y tu cintura perdió ${w} cm — estás en el camino!`;
  }
  if (bfDown) {
    return `¡Bajaste ${Math.abs(i.bfDelta!).toFixed(1)}% de grasa este mes! Tu esfuerzo se nota.`;
  }
  if (waistDown && weightDown) {
    return `Bajaste ${Math.abs(i.weightDelta!).toFixed(1)} kg y tu cintura perdió ${Math.abs(i.waistDelta!).toFixed(1)} cm.`;
  }
  if (i.sessionsCount >= 8) {
    return `Llevas ${i.sessionsCount} sesiones este mes. La constancia está dando resultados.`;
  }
  if (i.sessionsCount >= 4) {
    return `Ya llevas ${i.sessionsCount} sesiones este mes. Sigue así.`;
  }
  if (i.measurementsCount >= 2) {
    return 'Tu coach te midió este mes. Sigamos midiendo el progreso.';
  }
  return 'Cada medición cuenta. Vamos paso a paso.';
}

// ============================================================
// MuscleDatum para HumanBodySVG (sin cambios)
// ============================================================

function muscleDatum(
  delta: number | null,
  label: string,
  msg: string,
  hasData: boolean,
  currentValue: number | null = null,
  unit = 'cm',
): MuscleDatum {
  let trend: MuscleTrend = 'flat';
  if (hasData && delta != null) {
    if (Math.abs(delta) >= 0.5) trend = delta > 0 ? 'up' : 'down';
    else trend = 'flat';
  }
  return {
    trend,
    delta,
    label,
    currentValue,
    unit,
    message: msg,
    hasData,
  };
}

// ============================================================
// Página principal
// ============================================================

export default async function ProgresoPage() {
  const { clientId, user } = await requireClient();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

  const entries = await db.select().from(progressEntries)
    .where(eq(progressEntries.clientId, clientId))
    .orderBy(desc(progressEntries.recordedAt))
    .limit(30);

  // Routine → lista de ejercicios
  const [rutina] = await db.select().from(routines)
    .where(and(eq(routines.clientId, clientId), eq(routines.isActive, true)))
    .limit(1);

  let routineExercisesForAnalysis: Array<{
    routineExerciseId: string;
    nameEs: string;
    suggestedWeight: number | null;
    trackingType: 'reps' | 'time';
    suggestedDurationSeconds: number | null;
  }> = [];
  if (rutina) {
    const reRows = await db
      .select({
        id: routineExercises.id,
        nameEs: exercises.nameEs,
        weightKg: routineExercises.weightKg,
        trackingType: routineExercises.trackingType,
        durationSeconds: routineExercises.durationSeconds,
      })
      .from(routineExercises)
      .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
      .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
      .where(eq(routineDays.routineId, rutina.id))
      .orderBy(asc(routineDays.orderIndex), asc(routineExercises.orderIndex));
    routineExercisesForAnalysis = reRows.map((r) => ({
      routineExerciseId: r.id,
      nameEs: r.nameEs,
      suggestedWeight: r.weightKg ? Number(r.weightKg) : null,
      trackingType: (r.trackingType ?? 'reps') as 'reps' | 'time',
      suggestedDurationSeconds: r.durationSeconds,
    }));
  }

  const last = entries[0] ?? null;
  const previousMonth = entries[1] ?? null;

  const weightCurr = NUM(last?.weightKg);
  const weightPrev = NUM(previousMonth?.weightKg);
  const weightDelta = weightCurr != null && weightPrev != null ? +(weightCurr - weightPrev).toFixed(1) : null;

  const bfCurr = NUM(last?.bodyFatPct);
  const bfPrev = NUM(previousMonth?.bodyFatPct);
  const bfDelta = bfCurr != null && bfPrev != null ? +(bfCurr - bfPrev).toFixed(1) : null;

  const waistCurr = NUM(last?.waistCm);
  const waistPrev = NUM(previousMonth?.waistCm);
  const waistDelta = waistCurr != null && waistPrev != null ? +(waistCurr - waistPrev).toFixed(1) : null;

  const chestCurr = NUM(last?.chestCm);
  const chestPrev = NUM(previousMonth?.chestCm);
  const chestDelta = chestCurr != null && chestPrev != null ? +(chestCurr - chestPrev).toFixed(1) : null;

  const shoulderCurr = NUM(last?.shoulderCm);
  const shoulderPrev = NUM(previousMonth?.shoulderCm);
  const shoulderDelta = shoulderCurr != null && shoulderPrev != null ? +(shoulderCurr - shoulderPrev).toFixed(1) : null;

  const bicepCurr = NUM(last?.bicepFlexCm);
  const bicepPrev = NUM(previousMonth?.bicepFlexCm);
  const bicepDelta = bicepCurr != null && bicepPrev != null ? +(bicepCurr - bicepPrev).toFixed(1) : null;

  const thighCurr = NUM(last?.thighCm);
  const thighPrev = NUM(previousMonth?.thighCm);
  const thighDelta = thighCurr != null && thighPrev != null ? +(thighCurr - thighPrev).toFixed(1) : null;

  const bicepRelaxedCurr = NUM(last?.bicepRelaxedCm);
  const bicepRelaxedPrev = NUM(previousMonth?.bicepRelaxedCm);
  const bicepRelaxedDelta = bicepRelaxedCurr != null && bicepRelaxedPrev != null ? +(bicepRelaxedCurr - bicepRelaxedPrev).toFixed(1) : null;

  const forearmCurr = NUM(last?.forearmCm);
  const forearmPrev = NUM(previousMonth?.forearmCm);
  const forearmDelta = forearmCurr != null && forearmPrev != null ? +(forearmCurr - forearmPrev).toFixed(1) : null;

  const calfCurr = NUM(last?.calfCm);
  const calfPrev = NUM(previousMonth?.calfCm);
  const calfDelta = calfCurr != null && calfPrev != null ? +(calfCurr - calfPrev).toFixed(1) : null;

  const neckCurr = NUM(last?.neckCm);
  const neckPrev = NUM(previousMonth?.neckCm);
  const neckDelta = neckCurr != null && neckPrev != null ? +(neckCurr - neckPrev).toFixed(1) : null;

  // === Composición corporal (TODAS las fórmulas internas intactas) ===
  const composition = calcBodyComposition(
    {
      gender: (client?.gender as Gender | null) ?? null,
      heightCm: client?.heightCm ? Number(client.heightCm) : null,
      neckCm: neckCurr,
      waistCm: waistCurr,
      hipsCm: NUM(last?.hipsCm),
      birthDate: client?.birthDate ?? null,
    },
    weightCurr,
  );

  // === Datos para gráficas (chronological order) ===
  const chartData = [...entries].reverse().map((e) => ({
    fecha: e.recordedAt.slice(5),
    peso: NUM(e.weightKg),
    grasa: NUM(e.bodyFatPct),
    cintura: NUM(e.waistCm),
    pecho: NUM(e.chestCm),
  })).filter((d) => d.peso != null || d.grasa != null || d.cintura != null || d.pecho != null);

  const series = (key: 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'bicepFlexCm' | 'thighCm' | 'calfCm') =>
    [...entries].reverse().map((e) => NUM(e[key])).filter((v): v is number => v != null);

  // === Resumen semanal (sesiones este mes) ===
  const today = todayKeyInLima();
  const recentCount = entries.filter((e) => {
    const diff = (Date.parse(today) - Date.parse(e.recordedAt)) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;

  // === Sesiones en el gym (últimos 30 días) ===
  const sessionsCount = recentCount;

  // === Muscle data para el cuerpo humano ===
  const muscleData: Partial<Record<MuscleKey, MuscleDatum>> = {
    pecho: muscleDatum(
      chestDelta,
      chestDelta != null ? `${chestDelta > 0 ? '+' : ''}${chestDelta.toFixed(1)} cm` : '—',
      cmMensaje(chestDelta, 'Pecho', false),
      chestDelta != null || chestCurr != null,
      chestCurr,
    ),
    pierna: muscleDatum(
      thighDelta,
      thighDelta != null ? `${thighDelta > 0 ? '+' : ''}${thighDelta.toFixed(1)} cm` : '—',
      cmMensaje(thighDelta, 'Muslo', false),
      thighDelta != null || thighCurr != null,
      thighCurr,
    ),
    hombro: muscleDatum(
      shoulderDelta,
      shoulderDelta != null ? `${shoulderDelta > 0 ? '+' : ''}${shoulderDelta.toFixed(1)} cm` : '—',
      cmMensaje(shoulderDelta, 'Hombro', false),
      shoulderDelta != null || shoulderCurr != null,
      shoulderCurr,
    ),
    brazo: muscleDatum(
      bicepDelta,
      bicepDelta != null ? `${bicepDelta > 0 ? '+' : ''}${bicepDelta.toFixed(1)} cm` : '—',
      cmMensaje(bicepDelta, 'Bícep', false),
      bicepDelta != null || bicepCurr != null,
      bicepCurr,
    ),
    core: muscleDatum(
      waistDelta,
      waistDelta != null ? `${waistDelta > 0 ? '+' : ''}${waistDelta.toFixed(1)} cm` : '—',
      cinturaMensaje(waistDelta),
      waistDelta != null || waistCurr != null,
      waistCurr,
    ),
  };

  const insights = computeInsights({
    weightDelta, bfDelta, waistDelta,
    chestDelta, bicepDelta, shoulderDelta, thighDelta,
    measurementsCount: entries.length,
    sessionsCount,
  });

  const headline = buildHeroHeadline({
    weightDelta, bfDelta, waistDelta,
    chestDelta, bicepDelta, shoulderDelta, thighDelta,
    measurementsCount: entries.length,
    sessionsCount,
  });

  // Sin mediciones → EmptyState
  if (!last && routineExercisesForAnalysis.length === 0) {
    return <EmptyState nombre={user.fullName.split(' ')[0]} />;
  }

  // Medidas del cuerpo (con lógica isDown completa)
  const bodyMeasurements: Array<{
    key: string;
    label: string;
    curr: number | null;
    prev: number | null;
    unit: string;
    isDown: boolean;
  }> = [
    { key: 'neckCm',       label: 'Cuello',          curr: neckCurr,          prev: neckPrev,          unit: 'cm', isDown: false },
    { key: 'shoulderCm',   label: 'Hombros',         curr: shoulderCurr,      prev: shoulderPrev,      unit: 'cm', isDown: false },
    { key: 'chestCm',      label: 'Pecho',           curr: chestCurr,         prev: chestPrev,         unit: 'cm', isDown: false },
    { key: 'waistCm',      label: 'Cintura',         curr: waistCurr,         prev: waistPrev,         unit: 'cm', isDown: true },
    { key: 'hipsCm',       label: 'Cadera',          curr: NUM(last?.hipsCm), prev: NUM(previousMonth?.hipsCm), unit: 'cm', isDown: true },
    { key: 'bicepFlexCm',  label: 'Bícep flex',      curr: bicepCurr,         prev: bicepPrev,         unit: 'cm', isDown: false },
    { key: 'bicepRelaxedCm', label: 'Bícep relaj',    curr: bicepRelaxedCurr,  prev: bicepRelaxedPrev,  unit: 'cm', isDown: false },
    { key: 'forearmCm',    label: 'Antebrazo',       curr: forearmCurr,       prev: forearmPrev,       unit: 'cm', isDown: false },
    { key: 'thighCm',      label: 'Muslo',           curr: thighCurr,         prev: thighPrev,         unit: 'cm', isDown: false },
    { key: 'calfCm',       label: 'Pantorrilla',     curr: calfCurr,          prev: calfPrev,          unit: 'cm', isDown: false },
  ];

  return (
    <div className="space-y-5 pb-32">
      {/* 1. HERO "Tu mes" */}
      <header className="rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white p-5 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <p className="text-xs uppercase tracking-wider font-semibold opacity-90">Tu mes</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
          Hola, {user.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm mt-2 opacity-95 leading-snug">
          {headline}
        </p>
        <div className="flex items-center gap-2 mt-4 text-xs flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            Tu coach te midió {entries.length} {entries.length === 1 ? 'vez' : 'veces'} este mes
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
            <Dumbbell className="w-3.5 h-3.5" />
            {sessionsCount} {sessionsCount === 1 ? 'sesión' : 'sesiones'} en el gym
          </span>
        </div>
      </header>

      {/* 2. LO MÁS IMPORTANTE DE TU MES */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Lo más importante de tu mes
        </h2>
        <div className="space-y-3">
          {insights.map((ins) => {
            const Icon = ins.icon;
            const colorClass =
              ins.color === 'success' ? 'text-success' :
              ins.color === 'accent' ? 'text-accent-600' :
              'text-ink-500';
            const bgClass =
              ins.color === 'success' ? 'bg-success/5 border-success/30' :
              ins.color === 'accent' ? 'bg-accent-50 border-accent-200' :
              'bg-white border-ink-200';
            return (
              <article key={ins.key} className={`rounded-xl border p-4 ${bgClass}`}>
                <div className="flex items-start gap-3">
                  <span className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ins.color === 'success' ? 'bg-success/15' :
                    ins.color === 'accent' ? 'bg-accent-100' :
                    'bg-ink-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                      {ins.titulo}
                    </p>
                    <p className={`text-3xl font-extrabold tabular-nums leading-none mt-1 ${colorClass}`}>
                      {ins.numero}
                    </p>
                    <p className="text-sm text-ink-700 mt-2 leading-snug">
                      {ins.frase}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 3. TU CUERPO — mapa anatómico */}
      <section className="card space-y-3">
        <h2 className="font-bold text-ink-900 flex items-center gap-2">
          <Heart className="w-4 h-4 text-accent-500" />
          Tu cuerpo
        </h2>
        <p className="text-xs text-ink-500 -mt-1">
          Toca una zona para ver cómo cambió desde tu última medición.
        </p>
        <HumanBodySVG data={muscleData} />
      </section>

      {/* 4. COMPOSICIÓN CORPORAL — tarjeta premium legible */}
      {composition && composition.bodyFatPct != null && (
        <section className="card space-y-3 bg-gradient-to-br from-primary-50/40 via-white to-accent-50/30 border-primary-200">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-600" />
              Tu composición corporal
            </h2>
            {composition.ageYears != null && (
              <span className="text-[10px] text-ink-500 uppercase tracking-wider tabular-nums">
                {composition.ageYears} años
              </span>
            )}
          </div>
          {/* Numero protagonista: grasa */}
          <div className="flex items-baseline gap-3 pt-1">
            <span className="text-5xl font-extrabold tabular-nums text-ink-900 leading-none">
              {composition.bodyFatPct}
            </span>
            <span className="text-xl text-ink-500 font-medium">%</span>
            <span className="ml-auto text-xs text-ink-700 bg-white/80 px-2 py-1 rounded">
              {CATEGORY_LABELS[composition.category]}
            </span>
          </div>
          <p className="text-xs text-ink-500">
            Se calcula con medidas de cuello, cintura y cadera.
          </p>

          {/* Barra masa grasa vs masa magra */}
          {composition.fatMassKg != null && composition.leanMassKg != null && weightCurr != null && (
            <div className="space-y-1.5 pt-1">
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-ink-100">
                <div
                  className="h-full bg-accent-500"
                  style={{ width: `${(composition.fatMassKg / weightCurr) * 100}%` }}
                  aria-label="Masa grasa"
                />
                <div
                  className="h-full bg-primary-500"
                  style={{ width: `${(composition.leanMassKg / weightCurr) * 100}%` }}
                  aria-label="Masa magra"
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-500" />
                  Grasa: <strong className="tabular-nums">{composition.fatMassKg} kg</strong>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                  Músculo: <strong className="tabular-nums">{composition.leanMassKg} kg</strong>
                </span>
              </div>
            </div>
          )}

          {/* Mini contexto */}
          <div className="text-xs text-ink-600 pt-2 border-t border-ink-100">
            {weightCurr != null && `Peso ${weightCurr} kg`}
            {client?.heightCm && ` · Altura ${Number(client.heightCm)} cm`}
            {composition.fatMassKg != null && ` · Tu grasa: ${composition.fatMassKg} kg`}
          </div>

          {/* Frase interpretativa */}
          {bfDelta != null && (
            <p className="text-sm text-ink-700 leading-snug bg-white/70 p-3 rounded-lg border border-ink-100">
              {bfDelta < -1 ? 'Estás en muy buen camino: tu grasa baja y la composición mejora.' :
               bfDelta < 0 ? 'Vas bajando grasa. Mantén el plan y los resultados seguirán.' :
               bfDelta < 0.5 ? 'Mes de mantenimiento: tu cuerpo está estable. Buen trabajo.' :
               'Momento de ajustar el plan. Hablemos con tu coach sobre los siguientes pasos.'}
            </p>
          )}
        </section>
      )}

      {/* 5. TUS MEDIDAS — grid simple */}
      <section className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-900 flex items-center gap-2">
            <Ruler className="w-4 h-4 text-primary-600" />
            Tus medidas
          </h2>
          {last?.recordedAt && (
            <span className="text-[10px] text-ink-500 uppercase tracking-wider tabular-nums">
              {last.recordedAt}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {bodyMeasurements.map((m) => {
            const delta = m.curr != null && m.prev != null ? +(m.curr - m.prev).toFixed(1) : null;
            const hasData = m.curr != null;
            // Color: verde si va a favor (cintura baja = bien, biceps sube = bien)
            const isBetter = delta != null && (
              (m.isDown && delta < 0) || (!m.isDown && delta > 0)
            );
            const isFlat = delta != null && Math.abs(delta) < 0.5;
            return (
              <div key={m.key} className="bg-ink-50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                  {m.label}
                </p>
                {hasData ? (
                  <>
                    <p className="text-lg font-extrabold tabular-nums text-ink-900 leading-none mt-1">
                      {m.curr!.toFixed(1)}
                      <span className="text-[10px] text-ink-500 ml-0.5">{m.unit}</span>
                    </p>
                    {delta != null && Math.abs(delta) >= 0.1 && (
                      <p className={`text-[10px] font-bold mt-1 tabular-nums inline-flex items-center justify-center gap-0.5 ${
                        isFlat ? 'text-ink-400' : isBetter ? 'text-success' : 'text-accent-700'
                      }`}>
                        {delta > 0 ? (
                          <TrendingUp className="w-2.5 h-2.5" />
                        ) : delta < 0 ? (
                          <TrendingDown className="w-2.5 h-2.5" />
                        ) : null}
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs mes anterior
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[10px] text-ink-400 mt-1 italic leading-tight">
                    Tu coach la registra en tu próxima medición
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. TU EVOLUCIÓN — una sola sección con tabs */}
      {chartData.length >= 1 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Tu evolución
          </h2>
          <EvolucionTabs
            metricas={[
              { key: 'peso', label: 'Peso', unit: 'kg',
                values: series('weightKg'), curr: weightCurr, delta: weightDelta, isDown: false,
                frase: pesoMensaje(weightDelta) },
              { key: 'grasa', label: 'Grasa', unit: '%',
                values: series('bodyFatPct'), curr: bfCurr, delta: bfDelta, isDown: true,
                frase: grasaMensaje(bfDelta) },
              { key: 'cintura', label: 'Cintura', unit: 'cm',
                values: series('waistCm'), curr: waistCurr, delta: waistDelta, isDown: true,
                frase: cinturaMensaje(waistDelta) },
              { key: 'pecho', label: 'Pecho', unit: 'cm',
                values: series('chestCm'), curr: chestCurr, delta: chestDelta, isDown: false,
                frase: cmMensaje(chestDelta, 'Pecho', false) },
              { key: 'biceps', label: 'Bíceps', unit: 'cm',
                values: series('bicepFlexCm'), curr: bicepCurr, delta: bicepDelta, isDown: false,
                frase: cmMensaje(bicepDelta, 'Bíceps', false) },
              { key: 'muslo', label: 'Muslo', unit: 'cm',
                values: series('thighCm'), curr: thighCurr, delta: thighDelta, isDown: false,
                frase: cmMensaje(thighDelta, 'Muslo', false) },
            ]}
          />
        </section>
      )}

      {/* 7. TU FUERZA — antes "Progreso de entrenamiento" */}
      {rutina && routineExercisesForAnalysis.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <Dumbbell className="w-3.5 h-3.5" /> Tu fuerza
          </h2>
          <p className="text-xs text-ink-500 -mt-1">
            Cada tarjeta muestra cómo evoluciona un ejercicio. Toca una para ver gráficas y marcas personales.
          </p>
          <ExerciseAnalysis
            exercises={routineExercisesForAnalysis}
            apiBase="/api/client/exercise-log"
          />
        </section>
      )}
    </div>
  );
}

// ============================================================
// Componente cliente: tabs de evolución
// ============================================================


// ============================================================
// EmptyState cálido
// ============================================================

function EmptyState({ nombre }: { nombre: string }) {
  return (
    <div className="space-y-5 pb-32">
      <header className="rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-6 shadow-card text-center">
        <span className="h-16 w-16 rounded-full bg-white/15 mx-auto flex items-center justify-center mb-3">
          <Heart className="w-8 h-8" />
        </span>
        <h1 className="text-2xl font-extrabold">Hola, {nombre}</h1>
        <p className="text-sm opacity-90 mt-2">
          Pronto verás aquí cómo evoluciona tu cuerpo mes a mes.
        </p>
      </header>
      <div className="card text-center py-6 text-sm text-ink-500">
        <Eye className="w-5 h-5 mx-auto text-ink-300 mb-2" />
        <p>
          Tu coach aún no ha registrado medidas. Pídele que haga tu primera
          medición para empezar a ver tu progreso.
        </p>
      </div>
    </div>
  );
}