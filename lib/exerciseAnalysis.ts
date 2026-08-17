import type { ExerciseSetEntry } from './db/schema';

export interface RawLog {
  id: string;
  performedAt: Date | string;
  topSetWeightKg: string | null;
  topSetReps: number;
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
  rpe: number | null;
}

export interface DerivedAnalysis {
  sessions: DerivedSession[]; // cronológico (ascendente por fecha)
  prsByRepRange: Record<number, number>;
  allTimePR: { weight: number; reps: number; date: Date | null } | null;
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
    return {
      id: l.id,
      date: l.performedAt,
      avgWeight: +avgWeight.toFixed(2),
      volume: +volume.toFixed(2),
      setsCompleted: completed.length,
      totalSets: sets.length,
      topSet,
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

  const lastSession = sessions[sessions.length - 1] ?? null;

  return {
    sessions,
    prsByRepRange,
    allTimePR,
    lastSession,
    totalSessions: logs.length,
  };
}
