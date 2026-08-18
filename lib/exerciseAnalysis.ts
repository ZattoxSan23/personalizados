import type { ExerciseSetEntry } from './db/schema';

export interface RawLog {
  id: string;
  performedAt: Date | string;
  topSetWeightKg: string | null;
  /** Nullable: para ejercicios por tiempo (plancha, caminata...) no hay reps. */
  topSetReps: number | null;
  /** Duración del top set en segundos (solo para ejercicios por tiempo). */
  topSetDurationSeconds?: number | null;
  setsCompleted: number;
  rpe: number | null;
  notes?: string | null;
  sets: ExerciseSetEntry[] | null;
}

export interface DerivedSession {
  id: string;
  date: Date | string;
  avgWeight: number;
  volume: number;
  setsCompleted: number;
  totalSets: number;
  topSet: { w: number; r: number } | null;
  /** Duración máxima entre las series completadas (segundos). Solo para ejercicios por tiempo. */
  topSetDurationSeconds?: number | null;
  /** Suma de durationSeconds de series completadas (equivalente al volumen para tiempo). */
  totalTimeSeconds: number;
  rpe: number | null;
}

export interface DerivedAnalysis {
  sessions: DerivedSession[]; // cronológico (ascendente por fecha)
  prsByRepRange: Record<number, number>;
  /** PR histórico por peso×reps. Para ejercicios por tiempo usar allTimePRDurationSeconds. */
  allTimePR: { weight: number; reps: number; date: Date | null } | null;
  /** PR histórico por duración (segundos). Para ejercicios por reps usar allTimePR. */
  allTimePRDurationSeconds: number | null;
  lastSession: DerivedSession | null;
  totalSessions: number;
}

/**
 * Fallback: si el log antiguo no tiene `sets` jsonb, reconstruimos una sola
 * serie completada a partir de top_set_*, y replicamos setsCompleted veces
 * para que el volumen y adherencia tengan sentido.
 */
function effectiveSets(log: RawLog): ExerciseSetEntry[] {
  const stored = log.sets ?? [];
  if (stored.length > 0) return stored;

  const w = log.topSetWeightKg ? Number(log.topSetWeightKg) : 0;
  const r = log.topSetReps ?? 0;
  if (w <= 0 || r <= 0) return [];

  const reps = Math.max(1, log.setsCompleted ?? 1);
  return Array.from({ length: reps }, () => ({ weight: w, reps: r, completed: true }));
}

export function deriveAnalysis(logs: RawLog[]): DerivedAnalysis {
  const derived: DerivedSession[] = logs.map((l) => {
    const sets = effectiveSets(l);
    const completed = sets.filter((s) => s.completed);
    const volume = completed.reduce((sum, s) => sum + s.weight * s.reps, 0);
    const avgWeight = completed.length
      ? completed.reduce((sum, s) => sum + s.weight, 0) / completed.length
      : 0;
    const topSet = completed.reduce<{ w: number; r: number } | null>(
      (best, s) => (!best || s.weight > best.w ? { w: s.weight, r: s.reps } : best),
      null,
    );
    // Datos de tiempo: top set y total
    const topSetDurationSeconds = completed.reduce<number | null>(
      (best, s) => {
        const d = s.durationSeconds ?? 0;
        if (d <= 0) return best;
        if (best == null || d > best) return d;
        return best;
      },
      null,
    );
    const totalTimeSeconds = completed.reduce(
      (sum, s) => sum + (s.durationSeconds ?? 0),
      0,
    );
    return {
      id: l.id,
      date: l.performedAt,
      avgWeight: +avgWeight.toFixed(2),
      volume: +volume.toFixed(2),
      setsCompleted: completed.length,
      totalSets: sets.length,
      topSet,
      topSetDurationSeconds,
      totalTimeSeconds,
      rpe: l.rpe,
    };
  });

  // logs vienen desc por fecha del query → invertimos a ascendente
  const sessions = [...derived].reverse();

  const prsByRepRange: Record<number, number> = {};
  for (const l of logs) {
    for (const s of effectiveSets(l)) {
      if (!s.completed) continue;
      const r = s.reps;
      if (!prsByRepRange[r] || s.weight > prsByRepRange[r]) {
        prsByRepRange[r] = s.weight;
      }
    }
  }

  // PR por peso (ignora ejercicios por tiempo sin peso)
  const allTimePR = logs.reduce<{ weight: number; reps: number; date: Date | null } | null>(
    (best, l) => {
      for (const s of effectiveSets(l)) {
        if (!s.completed) continue;
        if (!best || s.weight > best.weight) {
          return { weight: s.weight, reps: s.reps, date: l.performedAt as Date };
        }
      }
      return best;
    },
    null,
  );

  // PR por tiempo: máximo topSetDurationSeconds histórico (o derivado de sets)
  let allTimePRDurationSeconds: number | null = null;
  for (const l of logs) {
    const topDur = l.topSetDurationSeconds ?? null;
    if (topDur != null && (allTimePRDurationSeconds == null || topDur > allTimePRDurationSeconds)) {
      allTimePRDurationSeconds = topDur;
    }
    for (const s of effectiveSets(l)) {
      if (!s.completed) continue;
      const d = s.durationSeconds ?? 0;
      if (d > 0 && (allTimePRDurationSeconds == null || d > allTimePRDurationSeconds)) {
        allTimePRDurationSeconds = d;
      }
    }
  }

  const lastSession = sessions[sessions.length - 1] ?? null;

  return {
    sessions,
    prsByRepRange,
    allTimePR,
    allTimePRDurationSeconds,
    lastSession,
    totalSessions: logs.length,
  };
}
