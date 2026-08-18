import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  progressEntries, routines, routineDays, routineExercises, exercises,
  clients,
} from '@/lib/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';
import {
  TrendingDown, TrendingUp, Minus, Scale, Activity, Ruler, Heart, Flame,
  Sparkles, Dumbbell, Target, Trophy, Calendar, Lightbulb, Eye,
} from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';
import ExerciseAnalysis from '@/app/components/ExerciseAnalysis';
import ProgresoChart from './ProgresoChart';
import HumanBodySVG, {
  type MuscleDatum, type MuscleKey, type MuscleTrend,
} from '@/app/components/HumanBodySVG';
import { todayKeyInLima } from '@/lib/date';
import {
  calcBodyComposition,
  CATEGORY_LABELS,
  WHR_RISK_LABELS,
  ageFromBirthDate,
  calcWaistHipRatio,
  whrRiskCategory,
  type Gender,
} from '@/lib/us-navy';

export const dynamic = 'force-dynamic';

const NUM = (v: string | null | undefined): number | null =>
  v == null ? null : Number(v);

// Mensajes motivadores según delta
function weightMessage(delta: number | null, prevWeight: number | null): string {
  if (delta == null || prevWeight == null) return 'Pídele a tu coach que registre tu peso este mes.';
  if (delta < -1) return `¡${Math.abs(delta).toFixed(1)} kg menos que el mes pasado! Sigue así`;
  if (delta < 0) return `Bajaste ${Math.abs(delta).toFixed(1)} kg. Pequeño gran paso.`;
  if (Math.abs(delta) < 0.5) return 'Tu peso se mantuvo. Si estás en recomposición, es buena señal.';
  return `Subiste ${delta.toFixed(1)} kg. Si es músculo, excelente.`;
}
function bfMessage(delta: number | null): string {
  if (delta == null) return 'Pídele a tu coach que registre cuello+cintura (±cadera) para calcular tu % grasa.';
  if (delta < -1) return `¡${Math.abs(delta).toFixed(1)}% menos grasa! Tu esfuerzo se nota`;
  if (delta < 0) return `Bajaste ${Math.abs(delta).toFixed(1)}% de grasa.`;
  if (Math.abs(delta) < 0.5) return 'Tu % grasa está estable.';
  return `Subió ${delta.toFixed(1)}%. Ajustemos el plan si es necesario.`;
}
function waistMessage(delta: number | null): string {
  if (delta == null) return 'Necesitamos tu medida de cintura para ver progreso.';
  if (delta < -1) return `¡Cintura -${Math.abs(delta).toFixed(1)} cm! Tu silueta cambió`;
  if (delta < 0) return `Cintura -${Math.abs(delta).toFixed(1)} cm. Vas bien.`;
  if (Math.abs(delta) < 0.5) return 'Cintura estable este mes.';
  return `Cintura +${delta.toFixed(1)} cm.`;
}
function cmUpMessage(delta: number | null, name: string): string {
  if (delta == null) return `Necesitamos medida de ${name} para ver progreso.`;
  if (delta > 0.5) return `¡${name} +${delta.toFixed(1)} cm! Ganaste volumen`;
  if (delta > 0) return `+${delta.toFixed(1)} cm en ${name}.`;
  if (Math.abs(delta) < 0.5) return `${name} estable.`;
  return `${name} -${Math.abs(delta).toFixed(1)} cm.`;
}
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

export default async function ProgresoPage() {
  const { clientId, user } = await requireClient();

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

  const entries = await db.select().from(progressEntries)
    .where(eq(progressEntries.clientId, clientId))
    .orderBy(desc(progressEntries.recordedAt))
    .limit(30);

  // Rutina activa → lista de ejercicios para la sección de entrenamiento
  const [rutina] = await db.select().from(routines)
    .where(and(eq(routines.clientId, clientId), eq(routines.isActive, true)))
    .limit(1);

  let routineExercisesForAnalysis: Array<{
    routineExerciseId: string;
    nameEs: string;
    suggestedWeight: number | null;
  }> = [];
  if (rutina) {
    const reRows = await db
      .select({
        id: routineExercises.id,
        nameEs: exercises.nameEs,
        weightKg: routineExercises.weightKg,
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
    }));
  }

  // Última vs "mes pasado" — entrada anterior a la última, sin importar fecha exacta
  const last = entries[0] ?? null;
  const previousMonth = entries[1] ?? null;

  // Deltas vs mes pasado
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

  // BMI actual
  const bmi = (() => {
    if (weightCurr == null || client?.heightCm == null) return null;
    const h = Number(client.heightCm) / 100;
    if (h <= 0) return null;
    return +(weightCurr / (h * h)).toFixed(1);
  })();

  // Datos para gráfica (chronological order)
  const chartData = [...entries].reverse().map((e) => ({
    fecha: e.recordedAt.slice(5),
    peso: NUM(e.weightKg),
    grasa: NUM(e.bodyFatPct),
    cintura: NUM(e.waistCm),
    pecho: NUM(e.chestCm),
  })).filter((d) => d.peso != null || d.grasa != null || d.cintura != null || d.pecho != null);

  // Series para sparklines (subset limitado a las que se usan en BigKPI)
  const sparklineSeries = (key: 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'bicepFlexCm' | 'thighCm' | 'shoulderCm') =>
    [...entries].reverse().map((e) => NUM(e[key])).filter((v): v is number => v != null);

  // Datos para HumanBodySVG. Si solo hay 1 medición (no hay mes pasado para
  // comparar), pasamos currentValue para mostrar el valor absoluto en el UI.
  const muscleData: Partial<Record<MuscleKey, MuscleDatum>> = {
    pecho: muscleDatum(
      chestDelta,
      chestDelta != null ? `${chestDelta > 0 ? '+' : ''}${chestDelta.toFixed(1)} cm` : '—',
      cmUpMessage(chestDelta, 'Pecho'),
      chestDelta != null || chestCurr != null,
      chestCurr,
    ),
    // espalda removida: la circunferencia pasando por hombros = hombros.
    // La circunferencia del pecho es una medida distinta y se guarda como chest_cm.
    pierna: muscleDatum(
      thighDelta,
      thighDelta != null ? `${thighDelta > 0 ? '+' : ''}${thighDelta.toFixed(1)} cm` : '—',
      cmUpMessage(thighDelta, 'Muslo'),
      thighDelta != null || thighCurr != null,
      thighCurr,
    ),
    hombro: muscleDatum(
      shoulderDelta,
      shoulderDelta != null ? `${shoulderDelta > 0 ? '+' : ''}${shoulderDelta.toFixed(1)} cm` : '—',
      cmUpMessage(shoulderDelta, 'Hombro'),
      shoulderDelta != null || shoulderCurr != null,
      shoulderCurr,
    ),
    brazo: muscleDatum(
      bicepDelta,
      bicepDelta != null ? `${bicepDelta > 0 ? '+' : ''}${bicepDelta.toFixed(1)} cm` : '—',
      cmUpMessage(bicepDelta, 'Bícep'),
      bicepDelta != null || bicepCurr != null,
      bicepCurr,
    ),
    core: muscleDatum(
      waistDelta,
      waistDelta != null ? `${waistDelta > 0 ? '+' : ''}${waistDelta.toFixed(1)} cm` : '—',
      waistMessage(waistDelta),
      waistDelta != null || waistCurr != null,
      waistCurr,
    ),
  };

  // === Composición corporal (TODAS las fórmulas de lib/us-navy.ts) ===
  // Usa Navy, Deurenberg, BMI, WHR, masa grasa/magra, categoría ACE, edad.
  const composition = calcBodyComposition(
    {
      gender: (client?.gender as Gender | null) ?? null,
      heightCm: client?.heightCm ? Number(client.heightCm) : null,
      neckCm: NUM(last?.neckCm),
      waistCm: waistCurr,
      hipsCm: NUM(last?.hipsCm),
      birthDate: client?.birthDate ?? null,
    },
    weightCurr,
  );

  // Mapa de TODAS las medidas con valor actual y delta vs mes pasado.
  // Orden pensado para que el grid se lea de arriba (cabeza) hacia abajo (pies).
  const allMeasurements: Array<{
    key: string;
    label: string;
    curr: number | null;
    prev: number | null;
    unit: string;
  }> = [
    { key: 'neckCm',     label: 'Cuello',          curr: NUM(last?.neckCm),     prev: NUM(previousMonth?.neckCm),     unit: 'cm' },
    { key: 'shoulderCm', label: 'Hombros',         curr: NUM(last?.shoulderCm), prev: NUM(previousMonth?.shoulderCm), unit: 'cm' },
    { key: 'chestCm',    label: 'Pecho',           curr: NUM(last?.chestCm),    prev: NUM(previousMonth?.chestCm),    unit: 'cm' },
    { key: 'waistCm',    label: 'Cintura',         curr: waistCurr,              prev: waistPrev,                     unit: 'cm' },
    { key: 'hipsCm',     label: 'Cadera',          curr: NUM(last?.hipsCm),     prev: NUM(previousMonth?.hipsCm),     unit: 'cm' },
    { key: 'bicepFlexCm',   label: 'Bícep flex',    curr: bicepCurr,              prev: bicepPrev,                     unit: 'cm' },
    { key: 'bicepRelaxedCm',label: 'Bícep relaj',   curr: NUM(last?.bicepRelaxedCm), prev: NUM(previousMonth?.bicepRelaxedCm), unit: 'cm' },
    { key: 'forearmCm',  label: 'Antebrazo',       curr: NUM(last?.forearmCm),  prev: NUM(previousMonth?.forearmCm),  unit: 'cm' },
    { key: 'thighCm',    label: 'Muslo',           curr: thighCurr,              prev: thighPrev,                     unit: 'cm' },
    { key: 'calfCm',     label: 'Pantorrilla',     curr: NUM(last?.calfCm),     prev: NUM(previousMonth?.calfCm),     unit: 'cm' },
  ];

  // Series de mediciones para gráficas individuales de evolución
  const series = (key: 'weightKg' | 'bodyFatPct' | 'waistCm' | 'chestCm' | 'bicepFlexCm' | 'thighCm' | 'calfCm') =>
    [...entries].reverse().map((e) => NUM(e[key])).filter((v): v is number => v != null);

  // Racha: cuántas mediciones lleva registradas en los últimos 30 días
  const today = todayKeyInLima();
  const recentCount = entries.filter((e) => {
    const diff = (Date.parse(today) - Date.parse(e.recordedAt)) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;

  // Hero message dinámico
  const heroMessage = (() => {
    if (entries.length === 0) return 'Pronto verás tu progreso aquí ✨';
    if (entries.length === 1) return 'Tu primera medición quedó guardada. ¡Vuelve el próximo mes!';
    if (weightDelta != null && weightDelta < -1) return '¡Vas con todo este mes! 🔥';
    if (weightDelta != null && weightDelta < 0) return 'Bajaste un poquito, ¡bien!';
    if (bfDelta != null && bfDelta < -1) return 'Tu cuerpo está cambiando 💪';
    if (entries.length >= 2) return 'Cada mes cuenta. Sigue midiéndote ✨';
  })();

  if (entries.length === 0 && routineExercisesForAnalysis.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Hero motivador */}
      <header className="rounded-2xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 text-white p-5 shadow-card overflow-hidden relative">
        <div className="absolute -top-8 -right-8 opacity-20">
          <Flame className="w-32 h-32" />
        </div>
        <p className="text-xs uppercase tracking-wider font-semibold opacity-80 inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Tu progreso
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
          Hola, {user.fullName.split(' ')[0]} 👋
        </h1>
        <p className="text-sm opacity-90 mt-1">{heroMessage}</p>
        <div className="flex items-center gap-3 mt-4 text-xs">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            {recentCount} {recentCount === 1 ? 'medición' : 'medidas'} este mes
          </span>
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full">
            <Trophy className="w-3.5 h-3.5" />
            {entries.length} {entries.length === 1 ? 'entrada' : 'entradas'} totales
          </span>
        </div>
      </header>

      {/* ESTE MES vs MES PASADO */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Este mes vs. mes pasado
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <BigKPI
            icon={Scale}
            iconBg="bg-primary-50"
            iconColor="text-primary-700"
            label="Peso"
            value={weightCurr}
            unit="kg"
            delta={weightDelta}
            deltaGood="down"
            message={weightMessage(weightDelta, weightPrev)}
            series={sparklineSeries('weightKg')}
            accentColor="#16a34a"
          />
          <BigKPI
            icon={Activity}
            iconBg="bg-accent-50"
            iconColor="text-accent-700"
            label="% Grasa"
            value={bfCurr}
            unit="%"
            delta={bfDelta}
            deltaGood="down"
            message={bfMessage(bfDelta)}
            series={sparklineSeries('bodyFatPct')}
            accentColor="#ef4444"
          />
          <BigKPI
            icon={Ruler}
            iconBg="bg-amber-50"
            iconColor="text-amber-700"
            label="Cintura"
            value={waistCurr}
            unit="cm"
            delta={waistDelta}
            deltaGood="down"
            message={waistMessage(waistDelta)}
            series={sparklineSeries('waistCm')}
            accentColor="#f59e0b"
          />
          <BigKPI
            icon={Heart}
            iconBg="bg-blue-50"
            iconColor="text-blue-700"
            label="IMC"
            value={bmi}
            unit=""
            delta={null}
            deltaGood="down"
            message={bmi == null ? 'Necesitamos peso y altura para calcular IMC.' : (
              bmi < 18.5 ? 'Bajo peso — hablemos con tu coach.' :
              bmi < 25 ? '¡IMC saludable! 💪' :
              bmi < 30 ? 'Sobrepeso. Sigamos entrenando.' :
              'Hablemos con tu coach sobre el plan.'
            )}
            series={[]}
            accentColor="#3b82f6"
          />
        </div>
      </section>

      {/* CUERPO HUMANO */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-ink-900 flex items-center gap-2">
            <Heart className="w-4 h-4 text-accent-500" />
            Cómo está cambiando tu cuerpo
          </h2>
        </div>
        <p className="text-xs text-ink-500 -mt-2">
          Compara contra tu medición del mes pasado. Pasa el dedo por una zona para ver el detalle.
        </p>
        <HumanBodySVG data={muscleData} />
      </section>

      {/* SECCIÓN PREMIUM: TUS MEDIDAS CORPORALES (solo lectura) */}
      {last && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> Tus medidas
          </h2>

          {/* Composición corporal: TODAS las fórmulas de lib/us-navy.ts */}
          {composition && (
            <div className="card space-y-3 bg-gradient-to-br from-primary-50/40 via-white to-accent-50/30 border-primary-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-ink-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary-600" />
                  Composición corporal
                </h3>
                {composition.ageYears != null && (
                  <span className="text-[10px] text-ink-500 uppercase tracking-wider tabular-nums">
                    {composition.ageYears} años
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* % Grasa US Navy */}
                <div className="rounded-lg bg-white/80 p-3 text-center border border-ink-100">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">
                    Grasa US Navy
                  </p>
                  {composition.bodyFatPct != null ? (
                    <>
                      <p className="text-2xl font-extrabold tabular-nums text-ink-900 mt-0.5">
                        {composition.bodyFatPct}%
                      </p>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        {CATEGORY_LABELS[composition.category]}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink-400 mt-1">Falta cuello+cadera</p>
                  )}
                </div>

                {/* % Grasa Deurenberg */}
                <div className="rounded-lg bg-white/80 p-3 text-center border border-ink-100">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">
                    Grasa Deurenberg
                  </p>
                  {composition.deurenbergBodyFatPct != null ? (
                    <>
                      <p className="text-2xl font-extrabold tabular-nums text-ink-900 mt-0.5">
                        {composition.deurenbergBodyFatPct}%
                      </p>
                      <p className="text-[10px] text-ink-500 mt-0.5">BMI + edad</p>
                    </>
                  ) : (
                    <p className="text-xs text-ink-400 mt-1">Falta BMI o edad</p>
                  )}
                </div>

                {/* IMC */}
                <div className="rounded-lg bg-white/80 p-3 text-center border border-ink-100">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">
                    IMC
                  </p>
                  {composition.bmi != null ? (
                    <p className="text-2xl font-extrabold tabular-nums text-ink-900 mt-0.5">
                      {composition.bmi}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-400 mt-1">Falta peso+altura</p>
                  )}
                </div>

                {/* RCC (WHR) */}
                <div className="rounded-lg bg-white/80 p-3 text-center border border-ink-100">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">
                    RCC (cintura/cadera)
                  </p>
                  {composition.waistHipRatio != null ? (
                    <>
                      <p className="text-2xl font-extrabold tabular-nums text-ink-900 mt-0.5">
                        {composition.waistHipRatio}
                      </p>
                      <p className="text-[10px] text-ink-500 mt-0.5">
                        Riesgo: {WHR_RISK_LABELS[composition.whrRisk]}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-ink-400 mt-1">Falta cintura+cadera</p>
                  )}
                </div>
              </div>

              {/* Resumen de masa grasa / masa magra */}
              {(composition.fatMassKg != null || composition.leanMassKg != null) && (
                <div className="rounded-lg bg-ink-900 text-white p-3 flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">
                      Masa grasa
                    </p>
                    <p className="text-xl font-extrabold tabular-nums leading-none mt-0.5">
                      {composition.fatMassKg ?? '—'}
                      <span className="text-xs opacity-70 ml-0.5">kg</span>
                    </p>
                  </div>
                  <div className="h-8 w-px bg-white/20" />
                  <div className="text-center flex-1">
                    <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">
                      Masa magra
                    </p>
                    <p className="text-xl font-extrabold tabular-nums leading-none mt-0.5">
                      {composition.leanMassKg ?? '—'}
                      <span className="text-xs opacity-70 ml-0.5">kg</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grid de TODAS las medidas corporales */}
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-ink-900 flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary-600" />
                Medidas corporales
              </h3>
              <span className="text-[10px] text-ink-500 uppercase tracking-wider tabular-nums">
                {last.recordedAt}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allMeasurements.map((m) => {
                const delta = m.curr != null && m.prev != null ? +(m.curr - m.prev).toFixed(1) : null;
                const isDown = (client?.gender === 'female' && ['waistCm', 'hipsCm'].includes(m.key)) || false;
                return (
                  <div key={m.key} className="bg-ink-50 rounded-lg p-2.5 text-center">
                    <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                      {m.label}
                    </p>
                    {m.curr != null ? (
                      <>
                        <p className="text-lg font-extrabold tabular-nums text-ink-900 leading-none mt-1">
                          {m.curr.toFixed(1)}
                          <span className="text-[10px] text-ink-500 ml-0.5">{m.unit}</span>
                        </p>
                        {delta != null && Math.abs(delta) >= 0.1 && (
                          <p
                            className={`text-[10px] font-bold mt-1 tabular-nums ${
                              Math.abs(delta) < 0.5
                                ? 'text-ink-400'
                                : 'text-success'
                            }`}
                          >
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)} vs mes anterior
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-ink-400 mt-1 italic">sin dato</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráficas individuales de evolución (recharts) */}
          {chartData.length >= 2 && (
            <div className="card space-y-3">
              <h3 className="font-bold text-ink-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary-600" />
                Evolución detallada
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EvolutionSpark
                  title="Peso"
                  unit="kg"
                  values={series('weightKg')}
                  color="#16a34a"
                />
                <EvolutionSpark
                  title="% Grasa"
                  unit="%"
                  values={series('bodyFatPct')}
                  color="#ef4444"
                />
                <EvolutionSpark
                  title="Cintura"
                  unit="cm"
                  values={series('waistCm')}
                  color="#f59e0b"
                />
                <EvolutionSpark
                  title="Pecho"
                  unit="cm"
                  values={series('chestCm')}
                  color="#3b82f6"
                />
                <EvolutionSpark
                  title="Bícep"
                  unit="cm"
                  values={series('bicepFlexCm')}
                  color="#8b5cf6"
                />
                <EvolutionSpark
                  title="Muslo"
                  unit="cm"
                  values={series('thighCm')}
                  color="#10b981"
                />
                <EvolutionSpark
                  title="Pantorrilla"
                  unit="cm"
                  values={series('calfCm')}
                  color="#06b6d4"
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* GRÁFICA */}
      {chartData.length >= 2 && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-600" />
              Tu evolución
            </h2>
            <span className="text-[10px] text-ink-500 uppercase tracking-wider">
              {chartData.length} mediciones
            </span>
          </div>
          <ProgresoChart data={chartData} />
        </section>
      )}

      {/* Progreso de entrenamiento */}
      {rutina && routineExercisesForAnalysis.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-600" />
            <h2 className="font-bold text-ink-900">Progreso en el gym</h2>
          </div>
          <p className="text-xs text-ink-500 -mt-1">
            Tu evolución por ejercicio. Toca una tarjeta para ver gráficas, PRs y volumen histórico.
          </p>
          <ExerciseAnalysis
            exercises={routineExercisesForAnalysis}
            apiBase="/api/client/exercise-log"
          />
        </section>
      )}

      {/* HISTORIAL MENSUAL */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Historial ({entries.length})
        </h2>
        <div className="space-y-2">
          {entries.map((e, idx) => {
            const prev = entries[idx + 1];
            return (
              <article key={e.id} className="card space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider tabular-nums">
                      {e.recordedAt}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Última
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {NUM(e.weightKg) != null && (
                    <Delta label="Peso" value={`${NUM(e.weightKg)?.toFixed(1)}kg`} prev={NUM(prev?.weightKg)} good="down" unit="kg" />
                  )}
                  {NUM(e.bodyFatPct) != null && (
                    <Delta label="Grasa" value={`${NUM(e.bodyFatPct)?.toFixed(1)}%`} prev={NUM(prev?.bodyFatPct)} good="down" unit="%" accent />
                  )}
                  {NUM(e.waistCm) != null && (
                    <Delta label="Cintura" value={`${NUM(e.waistCm)?.toFixed(1)}cm`} prev={NUM(prev?.waistCm)} good="down" unit="cm" />
                  )}
                  {NUM(e.chestCm) != null && (
                    <Delta label="Pecho" value={`${NUM(e.chestCm)?.toFixed(1)}cm`} prev={NUM(prev?.chestCm)} good="up" unit="cm" />
                  )}
                </div>
                {e.notes && e.notes !== 'Registro inicial' && e.notes !== 'Actualizado desde perfil' && (
                  <p className="text-xs text-ink-500 italic pt-1 border-t border-ink-100 inline-flex items-start gap-1.5">
                    <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{e.notes}</span>
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Delta({
  label, value, prev, good, unit, accent,
}: {
  label: string; value: string; prev: number | null;
  good: 'up' | 'down'; unit: string; accent?: boolean;
}) {
  // value ya viene con unidad (ej "70.5kg"); extraemos número
  const num = Number(value.replace(/[^0-9.\-]/g, ''));
  const delta = prev != null && !Number.isNaN(num) ? +(num - prev).toFixed(1) : null;
  const isPositive = delta != null && ((good === 'down' && delta < 0) || (good === 'up' && delta > 0));
  const isNeutral = delta != null && Math.abs(delta) < 0.5;

  return (
    <div className="bg-ink-50 rounded-md p-1.5 text-center">
      <p className={`text-[10px] font-semibold tabular-nums ${accent ? 'text-accent-700' : 'text-ink-900'}`}>
        {value}
      </p>
      <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">{label}</p>
      {delta != null && Math.abs(delta) >= 0.5 && (
        <p
          className={`text-[9px] font-bold mt-0.5 inline-flex items-center justify-center gap-0.5 tabular-nums ${
            isNeutral ? 'text-ink-500' :
            isPositive ? 'text-success' : 'text-accent-700'
          }`}
        >
          {delta > 0 ? '+' : ''}{delta}{unit}
        </p>
      )}
    </div>
  );
}

function BigKPI({
  icon: Icon, iconBg, iconColor, label, value, unit, delta, deltaGood,
  message, series, accentColor,
}: {
  icon: any; iconBg: string; iconColor: string;
  label: string; value: number | null; unit: string;
  delta: number | null; deltaGood: 'up' | 'down';
  message: string; series: number[]; accentColor: string;
}) {
  const noData = value == null;
  const isPositive =
    delta != null && ((deltaGood === 'down' && delta < 0) || (deltaGood === 'up' && delta > 0));
  const isFlat = delta != null && Math.abs(delta) < 0.5;

  return (
    <article className="card space-y-2 transition-all hover:shadow-card-hover">
      <header className="flex items-center justify-between">
        <span className={`h-9 w-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </span>
        {delta != null && Math.abs(delta) >= 0.5 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
              isFlat
                ? 'bg-ink-100 text-ink-600'
                : isPositive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-accent-50 text-accent-700'
            }`}
          >
            {delta > 0
              ? <TrendingUp className="w-3 h-3" />
              : delta < 0
                ? <TrendingDown className="w-3 h-3" />
                : <Minus className="w-3 h-3" />}
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </header>
      <div>
        {noData ? (
          <p className="text-2xl font-extrabold tabular-nums tracking-tight text-ink-300 leading-none">
            —
          </p>
        ) : (
          <p className="text-3xl font-extrabold tabular-nums tracking-tight text-ink-900 leading-none">
            {value}
            {unit && <span className="text-base font-semibold text-ink-500 ml-0.5">{unit}</span>}
          </p>
        )}
        <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1.5 font-semibold">
          {label}
        </p>
      </div>
      {series.length >= 2 && (
        <div className="pt-1">
          <Sparkline values={series} width={150} height={28} color={accentColor} />
        </div>
      )}
      <p className="text-[11px] text-ink-600 leading-snug pt-1 border-t border-ink-100">
        {message}
      </p>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="space-y-5 pb-32">
      <header className="rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-6 shadow-card text-center">
        <span className="h-16 w-16 rounded-full bg-white/15 mx-auto flex items-center justify-center mb-3">
          <Heart className="w-8 h-8" />
        </span>
        <h1 className="text-2xl font-extrabold">Mi progreso</h1>
        <p className="text-sm opacity-90 mt-2">
          Pronto verás aquí cómo evoluciona tu cuerpo mes a mes.
        </p>
      </header>
      <div className="card text-center py-6 text-sm text-ink-500">
        <Eye className="w-5 h-5 mx-auto text-ink-300 mb-2" />
        <p>
          Tu coach aún no ha registrado medidas. ¡Pídele que registre tu primera
          medición para empezar!
        </p>
      </div>
    </div>
  );
}
/**
 * Mini gráfica de evolución individual usando recharts (mobile-first).
 * Reutiliza los componentes de recharts ya importados en la app.
 */
function EvolutionSpark({
  title,
  unit,
  values,
  color,
}: {
  title: string;
  unit: string;
  values: number[];
  color: string;
}) {
  if (values.length === 0) return null;
  const data = values.map((v, i) => ({ idx: i, v }));
  const last = values[values.length - 1];
  const first = values[0];
  const delta = values.length >= 2 ? +(last - first).toFixed(1) : null;

  return (
    <div className="rounded-lg border border-ink-100 bg-white p-2.5 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink-700">{title}</span>
        <span className="text-[10px] text-ink-500 uppercase tracking-wider tabular-nums">
          {last.toFixed(1)} {unit}
        </span>
      </div>
      <div className="h-12">
        <Sparkline values={values} width={140} height={40} color={color} />
      </div>
      {delta != null && Math.abs(delta) >= 0.1 && (
        <p
          className={`text-[10px] font-bold tabular-nums ${
            Math.abs(delta) < 0.5 ? 'text-ink-400' : 'text-ink-600'
          }`}
        >
          {delta > 0 ? '+' : ''}{delta.toFixed(1)} {unit} en {values.length} mediciones
        </p>
      )}
    </div>
  );
}
