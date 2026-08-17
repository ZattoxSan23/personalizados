import { requireClient } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  progressEntries, routines, routineDays, routineExercises, exercises,
} from '@/lib/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';
import {
  LineChart, TrendingDown, TrendingUp, Minus, Ruler, Scale,
  Activity, Lightbulb, Dumbbell, Eye, Sparkles,
} from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';
import ExerciseAnalysis from '@/app/components/ExerciseAnalysis';
import ProgresoChart from './ProgresoChart';

export const dynamic = 'force-dynamic';

export default async function ProgresoPage() {
  const { clientId } = await requireClient();
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

  const chartData = [...entries].reverse().map((e) => ({
    fecha: e.recordedAt.slice(5),
    peso: e.weightKg ? Number(e.weightKg) : null,
    cintura: e.waistCm ? Number(e.waistCm) : null,
  })).filter((d) => d.peso !== null || d.cintura !== null);

  // Para sparklines
  const weightSeries = [...entries].reverse().map((e) => e.weightKg ? Number(e.weightKg) : null).filter((v): v is number => v != null);
  const waistSeries = [...entries].reverse().map((e) => e.waistCm ? Number(e.waistCm) : null).filter((v): v is number => v != null);
  const bodyFatSeries = [...entries].reverse().map((e) => e.bodyFatPct ? Number(e.bodyFatPct) : null).filter((v): v is number => v != null);
  const chestSeries = [...entries].reverse().map((e) => e.chestCm ? Number(e.chestCm) : null).filter((v): v is number => v != null);

  // Calcular deltas (último vs anterior)
  const lastWeight = weightSeries[weightSeries.length - 1];
  const prevWeight = weightSeries[weightSeries.length - 2];
  const weightDelta = lastWeight != null && prevWeight != null ? +(lastWeight - prevWeight).toFixed(1) : null;

  const lastBodyFat = bodyFatSeries[bodyFatSeries.length - 1];
  const prevBodyFat = bodyFatSeries[bodyFatSeries.length - 2];
  const bfDelta = lastBodyFat != null && prevBodyFat != null ? +(lastBodyFat - prevBodyFat).toFixed(1) : null;

  const lastWaist = waistSeries[waistSeries.length - 1];
  const prevWaist = waistSeries[waistSeries.length - 2];
  const waistDelta = lastWaist != null && prevWaist != null ? +(lastWaist - prevWaist).toFixed(1) : null;

  if (entries.length === 0 && routineExercisesForAnalysis.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-5 pb-32">
      {/* Header */}
      <header>
        <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Tu coach registra tus entrenamientos
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 mt-1">
          Mi progreso
        </h1>
      </header>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={Scale}
          label="Peso"
          value={lastWeight != null ? `${lastWeight} kg` : '—'}
          delta={weightDelta}
          series={weightSeries}
          accentColor="var(--color-primary-500)"
          iconBg="bg-primary-50"
          iconColor="text-primary-700"
        />
        <KPICard
          icon={Activity}
          label="% Grasa"
          value={lastBodyFat != null ? `${lastBodyFat}%` : '—'}
          delta={bfDelta}
          series={bodyFatSeries}
          accentColor="var(--color-accent-500)"
          iconBg="bg-accent-50"
          iconColor="text-accent-700"
        />
        <KPICard
          icon={Ruler}
          label="Cintura"
          value={lastWaist != null ? `${lastWaist} cm` : '—'}
          delta={waistDelta}
          series={waistSeries}
          accentColor="var(--color-ink-700)"
          iconBg="bg-ink-100"
          iconColor="text-ink-700"
        />
        <KPICard
          icon={Ruler}
          label="Pecho"
          value={chestSeries.length > 0 ? `${chestSeries[chestSeries.length - 1]} cm` : '—'}
          delta={null}
          series={chestSeries}
          accentColor="#3b82f6"
          iconBg="bg-blue-50"
          iconColor="text-blue-700"
        />
      </div>

      {/* Chart principal */}
      {chartData.length >= 2 && (
        <section className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-ink-900 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary-600" />
              Tendencia de peso
            </h2>
            <span className="text-[10px] text-ink-500 uppercase tracking-wider">
              últimas {chartData.length} mediciones
            </span>
          </div>
          <ProgresoChart data={chartData} />
        </section>
      )}

      {/* Progreso de entrenamiento */}
      {rutina && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary-600" />
            <h2 className="font-bold text-ink-900">Progreso de entrenamiento</h2>
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

      {/* Historial */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Historial ({entries.length})
        </h2>
        <div className="space-y-2">
          {entries.map((e) => (
            <article key={e.id} className="card space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-ink-400 uppercase tracking-wider">
                    {e.recordedAt}
                  </span>
                  {e.notes === 'Registro inicial' && (
                    <span className="text-[10px] font-bold text-accent-700 bg-accent-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Inicial
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {e.weightKg && (
                  <Measurement label="Peso" value={`${e.weightKg}kg`} />
                )}
                {e.waistCm && (
                  <Measurement label="Cintura" value={`${e.waistCm}cm`} />
                )}
                {e.bodyFatPct && (
                  <Measurement label="Grasa" value={`${e.bodyFatPct}%`} accent />
                )}
                {e.chestCm && (
                  <Measurement label="Pecho" value={`${e.chestCm}cm`} />
                )}
              </div>
              {e.notes && e.notes !== 'Registro inicial' && (
                <p className="text-xs text-ink-500 italic pt-1 border-t border-ink-100 inline-flex items-start gap-1.5">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>{e.notes}</span>
                </p>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="space-y-5 pb-32">
      <header>
        <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold">Evolución</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">Mi progreso</h1>
      </header>
      <div className="empty-state">
        <span className="h-16 w-16 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
          <LineChart className="w-8 h-8 text-ink-400" />
        </span>
        <h2 className="font-bold text-ink-900">Sin registros todavía</h2>
        <p className="text-sm text-ink-500 max-w-xs mx-auto">
          Tu coach aún no ha registrado datos. ¡Pronto verás tu evolución!
        </p>
      </div>
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  delta,
  series,
  accentColor,
  iconBg,
  iconColor,
}: {
  icon: any;
  label: string;
  value: string;
  delta: number | null;
  series: number[];
  accentColor: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <article className="card space-y-2 transition-all hover:shadow-card-hover">
      <header className="flex items-center justify-between">
        <span className={`h-8 w-8 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center`}>
          <Icon className="w-4 h-4" />
        </span>
        {delta != null && Math.abs(delta) > 0 && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded ${
              delta > 0
                ? delta > 0.5
                  ? 'bg-accent-50 text-accent-700'
                  : 'bg-primary-50 text-primary-700'
                : 'bg-emerald-50 text-success'
            }`}
          >
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </header>
      <div>
        <p className="text-2xl font-extrabold tabular-nums tracking-tight text-ink-900 leading-none">
          {value}
        </p>
        <p className="text-[10px] text-ink-500 uppercase tracking-wider mt-1 font-semibold">{label}</p>
      </div>
      {series.length >= 2 && (
        <div className="pt-1">
          <Sparkline values={series} width={140} height={32} color={accentColor} />
        </div>
      )}
    </article>
  );
}

function Measurement({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-ink-50 rounded-md p-1.5 text-center">
      <p className={`text-[10px] font-semibold tabular-nums ${accent ? 'text-accent-700' : 'text-ink-900'}`}>
        {value}
      </p>
      <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}