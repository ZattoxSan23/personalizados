import Link from 'next/link';
import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  routines, routineDays, routineExercises, exercises, exerciseLogs,
} from '@/lib/db/schema';
import { and, eq, desc, asc, inArray } from 'drizzle-orm';
import {
  Dumbbell, ChevronRight, Trophy, BarChart3, Lightbulb, Palmtree,
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus, Eye,
} from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';
import { dayOfWeekInLima, toLimaDateString } from '@/lib/date';

const DAYS_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DAYS_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const dynamic = 'force-dynamic';

export default async function RutinaPage() {
  const { clientId } = await requireClient();

  const [rutina] = await db.select().from(routines)
    .where(and(eq(routines.clientId, clientId), eq(routines.isActive, true)))
    .limit(1);

  if (!rutina) {
    return <EmptyState />;
  }

  const dias = await db.select().from(routineDays).where(eq(routineDays.routineId, rutina.id));
  const diasOrdenados = [...dias].sort(
    (a, b) => DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek),
  );

  const exerciseIds = await db
    .select({ id: routineExercises.id })
    .from(routineExercises)
    .innerJoin(routineDays, eq(routineDays.id, routineExercises.routineDayId))
    .where(eq(routineDays.routineId, rutina.id));

  const reIds = exerciseIds.map((e) => e.id);

  // Batch: PR + serie histórica por ejercicio en una sola query
  const logsByRe: Record<string, Array<{ weight: number; reps: number; date: string; topSet: { w: number; r: number } | null; volume: number; rpe: number | null }>> = {};
  let allTimePR = 0;

  if (reIds.length > 0) {
    const recentLogs = await db
      .select({
        routineExerciseId: exerciseLogs.routineExerciseId,
        weight: exerciseLogs.topSetWeightKg,
        reps: exerciseLogs.topSetReps,
        setsCompleted: exerciseLogs.setsCompleted,
        performedAt: exerciseLogs.performedAt,
        sets: exerciseLogs.sets,
        rpe: exerciseLogs.rpe,
      })
      .from(exerciseLogs)
      .where(
        and(
          eq(exerciseLogs.clientId, clientId),
          inArray(exerciseLogs.routineExerciseId, reIds),
        ),
      )
      .orderBy(desc(exerciseLogs.performedAt))
      .limit(reIds.length * 12);

    for (const log of recentLogs) {
      const list = logsByRe[log.routineExerciseId] ?? [];
      if (list.length >= 8) continue;
      const w = log.weight ? Number(log.weight) : 0;
      const r = log.reps ?? 0; // null cuando el ejercicio es por tiempo
      const sets = (log.sets ?? []) as Array<{ weight: number; reps: number; durationSeconds?: number; completed: boolean }>;
      const completed = sets.filter((s) => s.completed);
      const volume = completed.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const topSet = completed.length > 0
        ? completed.reduce<{ w: number; r: number }>((best, s) => (!best || s.weight > best.w ? { w: s.weight, r: s.reps } : best), { w: 0, r: 0 })
        : (w > 0 && r > 0 ? { w, r } : null);
      list.push({
        weight: w,
        reps: r,
        date: toLimaDateString(log.performedAt),
        topSet,
        volume: Math.round(volume),
        rpe: log.rpe,
      });
      logsByRe[log.routineExerciseId] = list;
      if (w > allTimePR) allTimePR = w;
    }
  }

  return (
    <div className="space-y-5 pb-32">
      <header className="space-y-1">
        <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold">
          {rutina.weeksDuration} semanas
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight">
          {rutina.title}
        </h1>
        <p className="text-sm text-ink-500">
          {diasOrdenados.length} días · {exerciseIds.length} ejercicios
        </p>
      </header>

      <OverviewCard
        totalExercises={exerciseIds.length}
        totalDays={diasOrdenados.length}
        allTimePR={allTimePR}
      />

      <div className="space-y-3">
        {diasOrdenados.map((d, i) => (
          <DayCard
            key={d.id}
            dayId={d.id}
            dayKey={d.dayOfWeek}
            dayName={d.name}
            dayIndex={i}
            logsByRe={logsByRe}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span className="h-16 w-16 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
        <Dumbbell className="w-8 h-8 text-ink-400" />
      </span>
      <h2 className="font-bold text-ink-900">Sin rutina activa</h2>
      <p className="text-sm text-ink-500 max-w-xs mx-auto">
        Tu coach aún no te ha asignado una rutina. Te avisaremos cuando esté lista.
      </p>
    </div>
  );
}

function OverviewCard({
  totalExercises,
  totalDays,
  allTimePR,
}: {
  totalExercises: number;
  totalDays: number;
  allTimePR: number;
}) {
  return (
    <div className="card bg-gradient-to-br from-primary-50 via-primary-50/40 to-white border-primary-200">
      <div className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-primary-glow">
          <BarChart3 className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold">Tu plan</p>
          <p className="text-sm font-semibold text-ink-900">Resumen semanal</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat label="Días" value={totalDays} />
        <Stat label="Ejercicios" value={totalExercises} />
        <Stat
          label="Tu PR"
          value={allTimePR > 0 ? `${allTimePR}kg` : '—'}
          accent={allTimePR > 0}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-white/80 p-2 text-center">
      <p className={`text-lg font-extrabold tabular-nums leading-none ${accent ? 'text-accent-600' : 'text-ink-900'}`}>
        {value}
      </p>
      <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

async function DayCard({
  dayId,
  dayKey,
  dayName,
  dayIndex,
  logsByRe,
}: {
  dayId: string;
  dayKey: string;
  dayName: string | null;
  dayIndex: number;
  logsByRe: Record<string, Array<{ weight: number; reps: number; date: string; topSet: { w: number; r: number } | null; volume: number; rpe: number | null }>>;
}) {
  const exes = await db
    .select({
      id: routineExercises.id,
      sets: routineExercises.sets,
      trackingType: routineExercises.trackingType,
      reps: routineExercises.reps,
      durationSeconds: routineExercises.durationSeconds,
      weightKg: routineExercises.weightKg,
      restSeconds: routineExercises.restSeconds,
      notes: routineExercises.notes,
      nameEs: exercises.nameEs,
      muscleGroup: exercises.muscleGroup,
    })
    .from(routineExercises)
    .innerJoin(exercises, eq(exercises.id, routineExercises.exerciseId))
    .where(eq(routineExercises.routineDayId, dayId))
    .orderBy(routineExercises.orderIndex);

  const dayShort = DAYS_FULL[dayIndex].slice(0, 3);
  // ⚠️ Día actual en zona horaria Lima (no UTC del servidor).
  const todayKey = DAYS_ORDER[dayOfWeekInLima()];
  const isToday = dayKey === todayKey;

  return (
    <article
      className={`card space-y-3 ${
        isToday ? 'ring-2 ring-primary-500 shadow-card-hover' : ''
      }`}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Hoy
            </span>
          )}
          <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">{dayShort}</span>
          <h3 className="font-bold text-ink-900 capitalize">{dayName}</h3>
        </div>
        <span className="text-[10px] font-bold text-ink-500 bg-ink-100 px-2 py-0.5 rounded tabular-nums">
          {exes.length} ej.
        </span>
      </header>

      <div className="space-y-1.5">
        {exes.length === 0 ? (
          <p className="text-xs text-ink-400 italic text-center py-3 inline-flex items-center justify-center gap-1.5 w-full">
            <Palmtree className="w-3.5 h-3.5" /> Día de descanso
          </p>
        ) : (
          exes.map((ex, idx) => {
            const history = logsByRe[ex.id] ?? [];
            const series = history.map((l) => l.weight).filter((w) => w > 0);
            const prWeight = series.length > 0 ? Math.max(...series) : 0;
            const last = history[history.length - 1];
            const lastWeight = last?.weight ?? 0;
            const trend = history.length >= 2
              ? history[history.length - 1].weight - history[history.length - 2].weight
              : null;
            return (
              <ExerciseRow
                key={ex.id}
                index={idx}
                exercise={ex}
                history={history}
                series={series}
                prWeight={prWeight}
                lastWeight={lastWeight}
                trend={trend}
              />
            );
          })
        )}
      </div>
    </article>
  );
}

function ExerciseRow({
  index,
  exercise,
  history,
  series,
  prWeight,
  lastWeight,
  trend,
}: {
  index: number;
  exercise: {
    id: string;
    sets: number;
    trackingType?: 'reps' | 'time';
    reps: string | null;
    durationSeconds: number | null;
    weightKg: string | null;
    restSeconds: number | null;
    notes: string | null;
    nameEs: string;
    muscleGroup: string | null;
  };
  history: Array<{ weight: number; reps: number; date: string; topSet: { w: number; r: number } | null; volume: number; rpe: number | null }>;
  series: number[];
  prWeight: number;
  lastWeight: number;
  trend: number | null;
}) {
  const muscleColor = {
    pecho: '#ef4444', espalda: '#3b82f6', pierna: '#10b981', hombro: '#f59e0b',
    brazo: '#8b5cf6', core: '#ec4899',
  }[exercise.muscleGroup ?? ''] ?? '#94a3b8';

  const last = history[history.length - 1];
  const surpassed = exercise.weightKg && lastWeight >= Number(exercise.weightKg);

  return (
    <details className="group bg-ink-50/60 rounded-lg">
      <summary className="cursor-pointer flex items-center gap-2.5 px-3 py-2.5 hover:bg-ink-100/60 rounded-lg transition-colors list-none [&::-webkit-details-marker]:hidden">
        <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: muscleColor }} />
        <span className="text-[10px] font-bold text-ink-400 font-mono w-5 tabular-nums">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-ink-900 truncate">{exercise.nameEs}</p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-ink-500 flex-wrap">
            <span className="bg-white rounded px-1.5 py-0.5 font-medium">
              {exercise.sets} × {exercise.reps}
            </span>
            {exercise.weightKg && (
              <span className="bg-white rounded px-1.5 py-0.5">
                meta {exercise.weightKg} kg
              </span>
            )}
            {lastWeight > 0 ? (
              <span
                className={`rounded px-1.5 py-0.5 font-medium tabular-nums inline-flex items-center gap-0.5 ${
                  surpassed ? 'bg-success/10 text-success' : 'bg-ink-100 text-ink-600'
                }`}
              >
                {surpassed ? <CheckCircle2 className="w-3 h-3" /> : exercise.weightKg ? <AlertCircle className="w-3 h-3" /> : null}
                hiciste {lastWeight}kg
                {trend != null && Math.abs(trend) >= 0.5 && (
                  <span className={`inline-flex items-center gap-0 ml-0.5 ${trend > 0 ? 'text-success' : 'text-danger'}`}>
                    {trend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(trend).toFixed(1)}
                  </span>
                )}
              </span>
            ) : null}
            {prWeight > 0 && (
              <span className="text-accent-600 font-bold inline-flex items-center gap-0.5">
                <Trophy className="w-3 h-3" /> {prWeight}
              </span>
            )}
          </div>
        </div>
        {series.length >= 2 && <Sparkline values={series} width={60} height={24} />}
        <ChevronRight className="w-4 h-4 text-ink-400 group-open:rotate-90 transition-transform" />
      </summary>

      <div className="px-3 pb-3 space-y-2 animate-fade-in">
        {exercise.notes && (
          <p className="text-xs text-ink-500 italic pt-1 border-t border-ink-200/60 inline-flex items-start gap-1.5">
            <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span>{exercise.notes}</span>
          </p>
        )}

        {/* Última sesión destacada */}
        {last ? <LastSessionCard last={last} suggestedWeight={exercise.weightKg ? Number(exercise.weightKg) : null} /> : (
          <p className="text-xs text-ink-500 italic pt-1 border-t border-ink-200/60 inline-flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> Aún sin registro de tu coach
          </p>
        )}

        {/* Historial */}
        {history.length >= 1 && (
          <div className="pt-1 border-t border-ink-200/60 space-y-1">
            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider pt-1.5">Últimos registros</p>
            <ul className="space-y-1">
              {[...history].reverse().slice(0, 5).map((l, i) => {
                const prev = history[history.length - 1 - i - 1];
                const delta = prev ? l.weight - prev.weight : null;
                return (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="text-ink-500 tabular-nums">{l.date}</span>
                    <span className="font-medium tabular-nums text-ink-700">
                      {l.topSet ? `${l.topSet.w}×${l.topSet.r}` : `${l.weight}kg`}
                      <span className="text-ink-400 ml-1.5">vol {l.volume}</span>
                      {l.rpe && <span className="text-ink-400 ml-1.5">RPE {l.rpe}</span>}
                    </span>
                    <span className="w-12 text-right">
                      {delta != null && Math.abs(delta) >= 0.5 && (
                        <span className={`inline-flex items-center gap-0.5 tabular-nums text-[10px] font-semibold ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                          {delta > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          {Math.abs(delta).toFixed(1)}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

function LastSessionCard({
  last,
  suggestedWeight,
}: {
  last: { weight: number; reps: number; date: string; topSet: { w: number; r: number } | null; volume: number; rpe: number | null };
  suggestedWeight: number | null;
}) {
  const daysAgo = Math.max(0, Math.round((Date.now() - new Date(last.date).getTime()) / 86400000));
  const relative = daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : `hace ${daysAgo} días`;
  const surpassed = suggestedWeight && last.weight >= suggestedWeight;

  return (
    <div className={`rounded-lg p-2.5 border ${surpassed ? 'bg-success/5 border-success/30' : 'bg-white border-ink-200'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">Última vez</p>
        <p className="text-[10px] text-ink-500 tabular-nums">{relative}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-base font-bold tabular-nums">
            {last.topSet ? `${last.topSet.w}×${last.topSet.r}` : `${last.weight}kg`}
          </p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">Top set</p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums">{last.volume}</p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">Volumen</p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums">{last.rpe ?? '—'}</p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">RPE</p>
        </div>
      </div>
      {surpassed && (
        <p className="text-[10px] text-success text-center mt-1.5 inline-flex items-center gap-1 w-full justify-center">
          <CheckCircle2 className="w-3 h-3" /> Superaste la meta ({suggestedWeight}kg)
        </p>
      )}
    </div>
  );
}