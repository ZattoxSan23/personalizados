'use client';

import Link from 'next/link';
import {
  Trophy, Dumbbell, UtensilsCrossed, Sparkles, Calendar, Flame,
  CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Lightbulb, Palmtree, Eye, Activity, Zap,
} from 'lucide-react';
import { Sparkline } from '@/app/components/Sparkline';
import { daysAgoInLima } from '@/lib/date';

type Exercise = {
  routineExerciseId: string;
  nameEs: string;
  muscleGroup: string | null;
  sets: number;
  trackingType: 'reps' | 'time';
  /** Reps objetivo (null si el ejercicio es por tiempo). */
  reps: string | null;
  /** Duración objetivo en segundos (null si el ejercicio es por reps). */
  durationSeconds: number | null;
  weightKg: string | null;
  restSeconds: number | null;
  notes: string | null;
  prWeight: number;
  lastWeight: number | null;
  lastReps: number | null;
  lastDurationSeconds: number | null;
  lastVolume: number;
  lastRpe: number | null;
  lastDate: string | null;
  trend: number | null;
  history: number[];
};

type Meal = {
  id: string;
  mealType: string;
  scheduledTime: string | null;
  name: string;
  calories: number | null;
  proteinG: string | null;
  carbsG: string | null;
  fatsG: string | null;
};

const MUSCLE_COLOR: Record<string, string> = {
  pecho: '#ef4444', espalda: '#3b82f6', pierna: '#10b981', hombro: '#f59e0b',
  brazo: '#8b5cf6', core: '#ec4899', cardio: '#64748b',
};

const MEAL_ORDER = ['desayuno', 'snack1', 'almuerzo', 'snack2', 'cena'];

const MEAL_LABELS: Record<string, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  cena: 'Cena',
  snack1: 'Snack AM',
  snack2: 'Snack PM',
};

type WeeklySummary = {
  sessions: number;
  volumeKg: number;
  prCount: number;
  hasData: boolean;
};

export default function SessionMode({
  todayLabel,
  isRestDay,
  diaRutinaName,
  ejercicios,
  meals,
  weeklySummary,
}: {
  clientId: string;
  todayLabel: string;
  isRestDay: boolean;
  diaRutinaName: string | null;
  ejercicios: Exercise[];
  meals: Meal[];
  weeklySummary?: WeeklySummary;
}) {
  return (
    <div className="space-y-5 pb-32">
      <header>
        <p className="text-xs text-ink-500 uppercase tracking-wider font-semibold inline-flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> {todayLabel}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 leading-tight mt-1">
          Misión de hoy
        </h1>
        {!isRestDay && diaRutinaName && (
          <p className="text-sm text-ink-500 mt-1">{diaRutinaName}</p>
        )}
      </header>

      {/* Resumen semanal motivador */}
      {weeklySummary && weeklySummary.hasData && (
        <section className="rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white p-4 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4" />
            <h2 className="font-bold text-sm uppercase tracking-wider">Tu semana</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat
              label="Sesiones"
              value={weeklySummary.sessions.toString()}
              icon={Dumbbell}
            />
            <Stat
              label="Volumen"
              value={`${weeklySummary.volumeKg}kg`}
              icon={Zap}
            />
            <Stat
              label="PRs nuevos"
              value={weeklySummary.prCount.toString()}
              icon={Trophy}
            />
          </div>
          {weeklySummary.prCount > 0 && (
            <p className="text-xs mt-3 pt-3 border-t border-white/20 text-center">
              ¡{weeklySummary.prCount} {weeklySummary.prCount === 1 ? 'PR nuevo' : 'PRs nuevos'} esta semana! 🎉
            </p>
          )}
        </section>
      )}

      {isRestDay ? (
        <RestDayCard />
      ) : (
        <div className="space-y-3">
          {ejercicios.map((ex, idx) => (
            <ExerciseCard key={ex.routineExerciseId} ex={ex} idx={idx} />
          ))}
        </div>
      )}

      {meals.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
              Comidas de hoy
            </h2>
            <Link href="/portal/alimentacion" className="text-xs text-primary-700 hover:text-primary-800 font-semibold">
              Ver plan completo
            </Link>
          </div>
          <div className="space-y-2">
            {meals
              .sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType))
              .map((m) => (
                <article key={m.id} className="card-interactive flex items-center gap-3">
                  <span className="h-10 w-10 rounded-lg bg-accent-50 text-accent-700 flex items-center justify-center flex-shrink-0">
                    <UtensilsCrossed className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink-900 truncate">{m.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-500">
                      <span>{MEAL_LABELS[m.mealType] ?? m.mealType}</span>
                      {m.scheduledTime && (
                        <>
                          <span>·</span>
                          <span className="font-medium">{m.scheduledTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {m.calories != null && (
                    <span className="text-xs font-bold text-primary-700 bg-primary-50 rounded px-2 py-0.5 whitespace-nowrap tabular-nums">
                      {m.calories} kcal
                    </span>
                  )}
                </article>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-1 opacity-80">
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-2xl font-extrabold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] uppercase tracking-wider opacity-80 mt-1.5 font-semibold">{label}</p>
    </div>
  );
}

function ExerciseCard({ ex, idx }: { ex: Exercise; idx: number }) {
  const color = MUSCLE_COLOR[ex.muscleGroup ?? ''] ?? '#94a3b8';
  // hasLog: true si hay datos útiles (peso o duración según tipo)
  const hasLog = ex.trackingType === 'time'
    ? (ex.lastDurationSeconds != null && ex.lastDurationSeconds > 0)
    : (ex.lastWeight != null && ex.lastWeight > 0);
  // surpassed: comparación correcta según trackingType
  const surpassed = ex.trackingType === 'time'
    ? Boolean(hasLog && ex.durationSeconds && ex.lastDurationSeconds && ex.lastDurationSeconds >= ex.durationSeconds)
    : Boolean(hasLog && ex.weightKg && ex.lastWeight && ex.lastWeight >= Number(ex.weightKg));

  return (
    <article className={`card space-y-3 ${surpassed ? 'border-success/40 bg-success/5' : ''}`}>
      <header className="flex items-start gap-3">
        <span
          className="h-3 w-3 rounded-full flex-shrink-0 mt-1.5"
          style={{ backgroundColor: color }}
          title={ex.muscleGroup ?? 'general'}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-ink-400 font-mono w-5">{String(idx + 1).padStart(2, '0')}</span>
            <h3 className="font-bold text-ink-900 leading-tight">{ex.nameEs}</h3>
            {surpassed && (
              <span className="badge-green inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Superaste la meta
              </span>
            )}
            {ex.prWeight > 0 && (
              <span className="text-accent-700 font-semibold text-[10px] inline-flex items-center gap-0.5">
                <Trophy className="w-3 h-3" /> PR {ex.prWeight}kg
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-ink-500 flex-wrap">
            <span className="bg-ink-100 rounded px-1.5 py-0.5 font-medium">
              meta {ex.sets} × {ex.trackingType === 'time' && ex.durationSeconds
                ? `${ex.durationSeconds}s`
                : (ex.reps ?? '—')}
              {ex.weightKg && <> @ {ex.weightKg}kg</>}
            </span>
            {ex.trend != null && Math.abs(ex.trend) >= 0.5 && (
              <span
                className={`inline-flex items-center gap-0.5 tabular-nums font-semibold ${
                  ex.trend > 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {ex.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {ex.trend > 0 ? '+' : ''}{ex.trend.toFixed(1)}kg vs anterior
              </span>
            )}
          </div>
          {ex.notes && (
            <p className="text-xs text-ink-500 italic mt-1.5 inline-flex items-start gap-1.5">
              <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span>{ex.notes}</span>
            </p>
          )}
        </div>
        {ex.history.length >= 2 && (
          <Sparkline values={ex.history} width={70} height={28} />
        )}
      </header>

      {hasLog ? (
        <LastLogBlock ex={ex} surpassed={surpassed} />
      ) : (
        <p className="text-xs text-ink-500 italic inline-flex items-center gap-1.5 pt-1 border-t border-ink-100">
          <Eye className="w-3 h-3" /> Aún sin registro de tu coach
        </p>
      )}
    </article>
  );
}

function LastLogBlock({ ex, surpassed }: { ex: Exercise; surpassed: boolean }) {
  // ⚠️ Diferencia en días calculada en zona horaria Lima (no UTC del servidor).
  // Antes se calculaba con Date.now() contra un string YYYY-MM-DD que JS
  // interpretaba como UTC midnight → daba 1 día extra ("ayer" cuando era "hoy").
  const daysAgo = daysAgoInLima(ex.lastDate);
  const relative = daysAgo === 0 ? 'hoy' : daysAgo === 1 ? 'ayer' : daysAgo != null ? `hace ${daysAgo} días` : '—';

  return (
    <div className="pt-1 border-t border-ink-100 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider inline-flex items-center gap-1">
          <Dumbbell className="w-3 h-3" /> Último registro de tu coach
        </p>
        <p className="text-[10px] text-ink-500 tabular-nums">{relative}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center bg-ink-50 rounded-lg p-2">
        <div>
          <p className="text-base font-bold tabular-nums text-ink-900">
            {/* Ejercicio por tiempo: mostrar duración (segs o mins).
                Ejercicio por reps: mostrar peso × reps. */}
            {ex.trackingType === 'time' ? (
              <span>{formatDuration(ex.lastDurationSeconds ?? 0)}</span>
            ) : ex.lastReps ? (
              <>
                {ex.lastWeight}
                <span className="text-ink-400 text-sm">×{ex.lastReps}</span>
              </>
            ) : (
              <span>{ex.lastWeight}<span className="text-ink-400 text-sm">kg</span></span>
            )}
          </p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">
            {ex.trackingType === 'time' ? 'Duración' : 'Top set'}
          </p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums text-ink-900">{ex.lastVolume}</p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">Volumen kg</p>
        </div>
        <div>
          <p className="text-base font-bold tabular-nums text-ink-900">{ex.lastRpe ?? '—'}</p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider">RPE</p>
        </div>
      </div>
      {surpassed && (ex.trackingType === 'time'
        ? ex.durationSeconds
        : ex.weightKg) && (
        <p className="text-[10px] text-success text-center inline-flex items-center justify-center gap-1 w-full">
          <CheckCircle2 className="w-3 h-3" /> Superaste la meta de{' '}
          {ex.trackingType === 'time'
            ? formatDuration(ex.durationSeconds ?? 0)
            : `${ex.weightKg}kg`}
        </p>
      )}
    </div>
  );
}

function RestDayCard() {
  return (
    <div className="card space-y-3 bg-gradient-to-br from-primary-50 to-emerald-50 border-primary-200">
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-full bg-white text-primary-600 flex items-center justify-center shadow-xs">
          <Sparkles className="w-6 h-6" />
        </span>
        <div>
          <h2 className="font-bold text-ink-900 inline-flex items-center gap-1.5">
            <Palmtree className="w-4 h-4" /> Recupera y recarga
          </h2>
          <p className="text-sm text-ink-600">Tu coach programó este día para descanso.</p>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-ink-700">
        <li className="flex items-start gap-2">
          <Flame className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
          <span>15-20 min de movilidad: caderas, hombros, columna</span>
        </li>
        <li className="flex items-start gap-2">
          <Flame className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
          <span>Hidratación: al menos 2.5L de agua repartidos en el día</span>
        </li>
        <li className="flex items-start gap-2">
          <Flame className="w-4 h-4 text-accent-500 flex-shrink-0 mt-0.5" />
          <span>Sueño: 7-8h para óptima recuperación muscular</span>
        </li>
      </ul>
    </div>
  );
}
/** Formatea segundos como "30s" / "1:30" / "20 min". */
function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return '—';
  if (totalSeconds >= 60 && totalSeconds % 60 === 0) {
    return `${totalSeconds / 60} min`;
  }
  if (totalSeconds >= 60) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${totalSeconds}s`;
}
