'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid,
} from 'recharts';
import {
  Trophy, TrendingUp, Loader2, Activity, ChevronDown, ChevronUp, Calendar, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { formatSeconds } from '@/lib/format';

interface ExerciseSummary {
  routineExerciseId: string;
  exerciseName: string;
  suggestedWeight: number | null;
  sessions: Array<{
    id: string;
    date: string;
    avgWeight: number;
    volume: number;
    setsCompleted: number;
    totalSets: number;
    topSet: { w: number; r: number } | null;
    rpe: number | null;
  }>;
  prsByRepRange: Record<number, number>;
  allTimePR: { weight: number; reps: number; date: string | null } | null;
  allTimePRDurationSeconds?: number | null;
  lastSession: {
    id: string;
    date: string;
    avgWeight: number;
    volume: number;
    setsCompleted: number;
    totalSets: number;
    topSet: { w: number; r: number } | null;
    topSetDurationSeconds?: number | null;
    totalTimeSeconds: number;
    rpe: number | null;
  } | null;
  totalSessions: number;
}

interface Props {
  exercises: Array<{
    routineExerciseId: string;
    nameEs: string;
    suggestedWeight: number | null;
    /** 'reps' = peso × reps; 'time' = segundos por serie. */
    trackingType?: 'reps' | 'time';
    /** Duración objetivo en segundos (solo para trackingType='time'). */
    suggestedDurationSeconds?: number | null;
  }>;
  /** Endpoint del que se obtiene el análisis per-ejercicio. */
  apiBase?: string;
}

export default function ExerciseAnalysis({
  exercises,
  apiBase = '/api/trainer/exercise-log',
}: Props) {
  const [analyses, setAnalyses] = useState<Map<string, ExerciseSummary>>(new Map());
  const [loadingMap, setLoadingMap] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function loadAnalysis(reId: string) {
    setLoadingMap((prev) => new Set(prev).add(reId));
    try {
      const res = await fetch(`${apiBase}?routineExerciseId=${reId}`);
      const data = await res.json();
      if (res.ok) {
        const ex = exercises.find((e) => e.routineExerciseId === reId);
        const summary: ExerciseSummary = {
          routineExerciseId: reId,
          exerciseName: ex?.nameEs ?? 'Ejercicio',
          suggestedWeight: ex?.suggestedWeight ?? null,
          sessions: data.sessions ?? [],
          prsByRepRange: data.prsByRepRange ?? {},
          allTimePR: data.allTimePR ?? null,
          allTimePRDurationSeconds: data.allTimePRDurationSeconds ?? null,
          lastSession: data.lastSession ?? null,
          totalSessions: data.totalSessions ?? 0,
        };
        setAnalyses((prev) => new Map(prev).set(reId, summary));
      }
    } catch {
      // ignore
    } finally {
      setLoadingMap((prev) => {
        const next = new Set(prev);
        next.delete(reId);
        return next;
      });
    }
  }

  function toggleExpand(reId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(reId)) {
        next.delete(reId);
      } else {
        next.add(reId);
        if (!analyses.has(reId)) loadAnalysis(reId);
      }
      return next;
    });
  }

  // Auto-cargar todos los análisis al montar para que el cliente vea las
  // métricas (PR, sesiones, tendencia) sin tener que expandir cada tarjeta.
  // Si la lista es grande (>8 ejercicios) igual disparamos todos en paralelo;
  // es lo que el cliente espera ver de un vistazo.
  useEffect(() => {
    for (const e of exercises) {
      if (!analyses.has(e.routineExerciseId) && !loadingMap.has(e.routineExerciseId)) {
        loadAnalysis(e.routineExerciseId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercises]);

  if (exercises.length === 0) {
    return (
      <div className="empty-state">
        <span className="h-12 w-12 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
          <Activity className="w-6 h-6 text-ink-400" />
        </span>
        <p className="text-sm font-medium text-ink-700">Sin ejercicios en la rutina</p>
        <p className="text-xs text-ink-500">Crea una rutina para empezar a registrar progreso</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exercises.map((ex) => (
        <ExerciseRow
          key={ex.routineExerciseId}
          exercise={ex}
          analysis={analyses.get(ex.routineExerciseId) ?? null}
          loading={loadingMap.has(ex.routineExerciseId)}
          expanded={expanded.has(ex.routineExerciseId)}
          onToggle={() => toggleExpand(ex.routineExerciseId)}
        />
      ))}
    </div>
  );
}

function ExerciseRow({
  exercise,
  analysis,
  loading,
  expanded,
  onToggle,
}: {
  exercise: {
  routineExerciseId: string;
  nameEs: string;
  suggestedWeight: number | null;
  trackingType?: 'reps' | 'time';
  suggestedDurationSeconds?: number | null;
};
  analysis: ExerciseSummary | null;
  loading: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const trend = analysis ? computeTrend(analysis.sessions) : null;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left flex items-center gap-3"
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-ink-900 truncate">{exercise.nameEs}</p>
          <div className="flex items-center gap-3 text-xs text-ink-500 mt-0.5 flex-wrap">
            {analysis ? (
              <>
                {/* PR por reps (si hay peso) */}
                {analysis.allTimePR && analysis.allTimePR.weight > 0 && exercise.trackingType !== 'time' && (
                  <span className="inline-flex items-center gap-0.5">
                    <Trophy className="w-3 h-3 text-amber-600" />
                    <span className="tabular-nums font-semibold text-ink-700">
                      {analysis.allTimePR.weight}×{analysis.allTimePR.reps}
                    </span>
                  </span>
                )}
                {/* PR por tiempo */}
                {exercise.trackingType === 'time' && analysis.allTimePRDurationSeconds != null && analysis.allTimePRDurationSeconds > 0 && (
                  <span className="inline-flex items-center gap-0.5">
                    <Trophy className="w-3 h-3 text-amber-600" />
                    <span className="tabular-nums font-semibold text-ink-700">
                      {formatSeconds(analysis.allTimePRDurationSeconds)}
                    </span>
                  </span>
                )}
                <span className="tabular-nums">{analysis.totalSessions} sesiones</span>
                {trend && (
                  <span
                    className={`inline-flex items-center gap-0.5 tabular-nums ${
                      trend.direction === 'up'
                        ? 'text-success'
                        : trend.direction === 'down'
                        ? 'text-danger'
                        : 'text-ink-400'
                    }`}
                  >
                    {trend.direction === 'up' && <TrendingUp className="w-3 h-3" />}
                    {trend.direction === 'down' && '↓'}
                    {trend.direction === 'same' && '='}
                    {trend.delta > 0 && ` ${trend.delta.toFixed(1)}kg`}
                  </span>
                )}
              </>
            ) : (
              <span className="text-ink-400">Sin sesiones registradas</span>
            )}
          </div>
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-ink-400" />
        ) : expanded ? (
          <ChevronUp className="w-4 h-4 text-ink-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-ink-400" />
        )}
      </button>

      {expanded && analysis && analysis.sessions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-ink-100 space-y-3 animate-fade-in">
          <ProgressionChart sessions={analysis.sessions} />
          <VolumeChart sessions={analysis.sessions} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PRHeatmap prsByRepRange={analysis.prsByRepRange} suggestedWeight={exercise.suggestedWeight} />
            <LastSessionBreakdown
              lastSession={analysis.lastSession}
              suggestedWeight={exercise.suggestedWeight}
              trackingType={exercise.trackingType ?? 'reps'}
              suggestedDurationSeconds={exercise.suggestedDurationSeconds}
            />
          </div>
          <ConsistencyMetrics sessions={analysis.sessions} />
        </div>
      )}

      {expanded && analysis && analysis.sessions.length === 0 && (
        <div className="mt-3 pt-3 border-t border-ink-100 text-center py-4 text-sm text-ink-500">
          Aún no hay sesiones registradas para este ejercicio.
        </div>
      )}
    </div>
  );
}

function computeTrend(sessions: ExerciseSummary['sessions']) {
  if (sessions.length < 2) return null;
  const recent = sessions.slice(-3);
  const older = sessions.slice(-6, -3);
  if (older.length === 0) return null;
  const recentAvg = recent.reduce((s, x) => s + x.avgWeight, 0) / recent.length;
  const olderAvg = older.reduce((s, x) => s + x.avgWeight, 0) / older.length;
  const delta = recentAvg - olderAvg;
  if (Math.abs(delta) < 0.5) return { direction: 'same' as const, delta: 0 };
  return { direction: delta > 0 ? ('up' as const) : ('down' as const), delta: Math.abs(delta) };
}

function ProgressionChart({ sessions }: { sessions: ExerciseSummary['sessions'] }) {
  const data = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }),
    avg: s.avgWeight,
    top: s.topSet?.w ?? null,
  }));

  return (
    <div className="bg-ink-50 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <TrendingUp className="w-3.5 h-3.5 text-primary-700" />
        <p className="text-[10px] font-semibold text-ink-700 uppercase tracking-wide">
          Progresión (avg kg)
        </p>
      </div>
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: 4, borderRadius: 6 }}
              formatter={(value: any) => [`${value} kg`, 'Avg']}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ fill: '#7c3aed', r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="top"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={{ fill: '#f59e0b', r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-3 px-1 text-[10px] text-ink-500">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-primary-600" />
          Avg por sesión
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Top set
        </span>
      </div>
    </div>
  );
}

function VolumeChart({ sessions }: { sessions: ExerciseSummary['sessions'] }) {
  const data = sessions.map((s) => ({
    date: new Date(s.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }),
    volume: s.volume,
  }));

  return (
    <div className="bg-ink-50 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Activity className="w-3.5 h-3.5 text-primary-700" />
        <p className="text-[10px] font-semibold text-ink-700 uppercase tracking-wide">
          Volumen por sesión (kg·reps)
        </p>
      </div>
      <div className="h-28">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 9 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{ fontSize: 11, padding: 4, borderRadius: 6 }}
              formatter={(value: any) => [`${value} kg·reps`, 'Volumen']}
            />
            <Bar dataKey="volume" fill="#3b82f6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PRHeatmap({
  prsByRepRange,
  suggestedWeight,
}: {
  prsByRepRange: Record<number, number>;
  suggestedWeight: number | null;
}) {
  const reps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  const maxW = Math.max(...Object.values(prsByRepRange), suggestedWeight ?? 0, 1);

  return (
    <div className="bg-ink-50 rounded-lg p-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <Trophy className="w-3.5 h-3.5 text-amber-600" />
        <p className="text-[10px] font-semibold text-ink-700 uppercase tracking-wide">
          PRs por rep range
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1">
        {reps.map((r) => {
          const w = prsByRepRange[r];
          const intensity = w ? Math.min(1, w / maxW) : 0;
          const hasPR = w != null && w > 0;
          return (
            <div
              key={r}
              className="text-center"
              title={hasPR ? `${w} kg × ${r} reps` : 'Sin PR'}
            >
              <div
                className={`rounded-md h-9 flex items-center justify-center text-[10px] font-bold tabular-nums transition-colors ${
                  hasPR ? 'text-white' : 'bg-ink-100 text-ink-400'
                }`}
                style={{
                  backgroundColor: hasPR
                    ? `rgba(245, 158, 11, ${0.25 + intensity * 0.6})`
                    : undefined,
                }}
              >
                {hasPR ? `${w}` : '—'}
              </div>
              <p className="text-[9px] text-ink-500 mt-0.5 tabular-nums">{r}r</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LastSessionBreakdown({
  lastSession,
  suggestedWeight,
  trackingType = 'reps',
  suggestedDurationSeconds = null,
}: {
  lastSession: ExerciseSummary['lastSession'];
  suggestedWeight: number | null;
  trackingType?: 'reps' | 'time';
  suggestedDurationSeconds?: number | null;
}) {
  if (!lastSession) {
    return (
      <div className="bg-ink-50 rounded-lg p-2 text-xs text-ink-500 text-center">
        Sin sesión previa
      </div>
    );
  }

  const total = lastSession.totalSets || lastSession.setsCompleted || 1;
  const adherence = (lastSession.setsCompleted / total) * 100;
  // aboveTarget: para reps usa peso×meta; para tiempo usa duración vs meta
  const aboveTarget = trackingType === 'time'
    ? (lastSession.topSetDurationSeconds != null && suggestedDurationSeconds != null
        && lastSession.topSetDurationSeconds >= suggestedDurationSeconds)
    : (lastSession.topSet && suggestedWeight
        ? lastSession.topSet.w >= suggestedWeight
        : null);
  const isTime = trackingType === 'time';

  return (
    <div className="bg-ink-50 rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Calendar className="w-3.5 h-3.5 text-primary-700" />
        <p className="text-[10px] font-semibold text-ink-700 uppercase tracking-wide">
          Última sesión
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-base font-bold tabular-nums">
            {isTime
              ? (lastSession.topSetDurationSeconds != null && lastSession.topSetDurationSeconds > 0
                  ? formatSeconds(lastSession.topSetDurationSeconds)
                  : '—')
              : (lastSession.topSet ? `${lastSession.topSet.w}×${lastSession.topSet.r}` : '—')}
          </p>
          <p className="text-[9px] text-ink-500 uppercase">{isTime ? 'Top duración' : 'Top set'}</p>
        </div>
        <div>
          {isTime ? (
            <>
              <p className="text-base font-bold tabular-nums">
                {formatSeconds(lastSession.totalTimeSeconds)}
              </p>
              <p className="text-[9px] text-ink-500 uppercase">Total</p>
            </>
          ) : (
            <>
              <p className="text-base font-bold tabular-nums">{lastSession.volume}</p>
              <p className="text-[9px] text-ink-500 uppercase">Volumen</p>
            </>
          )}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className="text-ink-600">Adherencia</span>
          <span className="font-bold tabular-nums">
            {lastSession.setsCompleted}/{total} ({Math.round(adherence)}%)
          </span>
        </div>
        <div className="h-1.5 bg-ink-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              adherence >= 80 ? 'bg-success' : adherence >= 60 ? 'bg-warning' : 'bg-danger'
            }`}
            style={{ width: `${adherence}%` }}
          />
        </div>
      </div>
      {((!isTime && suggestedWeight) || (isTime && suggestedDurationSeconds)) && (
        <p className="text-[10px] text-ink-600 text-center inline-flex items-center justify-center gap-1 w-full">
          {aboveTarget ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-success" />
              <span>
                {isTime
                  ? `Top alcanza meta (${formatSeconds(suggestedDurationSeconds ?? 0)})`
                  : `Top set alcanza meta (${suggestedWeight}kg)`}
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-warning" />
              <span>
                {isTime
                  ? `Bajo meta (${formatSeconds(suggestedDurationSeconds ?? 0)})`
                  : `Bajo meta (${suggestedWeight}kg)`}
              </span>
            </>
          )}
        </p>
      )}
      {lastSession.rpe && (
        <p className="text-[10px] text-ink-500 text-center">RPE {lastSession.rpe}/10</p>
      )}
    </div>
  );
}

function ConsistencyMetrics({ sessions }: { sessions: ExerciseSummary['sessions'] }) {
  if (sessions.length === 0) return null;

  const avgAdherence =
    sessions.reduce((s, x) => {
      const total = x.totalSets || x.setsCompleted || 1;
      return s + (x.setsCompleted / total);
    }, 0) / sessions.length;
  const avgVolume = sessions.reduce((s, x) => s + x.volume, 0) / sessions.length;
  const peakVolume = Math.max(...sessions.map((s) => s.volume));

  return (
    <div className="grid grid-cols-3 gap-2 text-center bg-ink-50 rounded-lg p-2">
      <div>
        <p className="text-base font-bold tabular-nums">{Math.round(avgAdherence * 100)}%</p>
        <p className="text-[9px] text-ink-500 uppercase">Adherencia prom</p>
      </div>
      <div>
        <p className="text-base font-bold tabular-nums">{Math.round(avgVolume)}</p>
        <p className="text-[9px] text-ink-500 uppercase">Vol prom</p>
      </div>
      <div>
        <p className="text-base font-bold tabular-nums text-amber-600">{peakVolume}</p>
        <p className="text-[9px] text-ink-500 uppercase">Vol PR</p>
      </div>
    </div>
  );
}