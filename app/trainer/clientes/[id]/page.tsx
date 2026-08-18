import { notFound } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  clients, routines, routineDays, routineExercises, exercises,
  mealPlans, meals, progressEntries,
} from '@/lib/db/schema';
import { and, eq, desc, asc } from 'drizzle-orm';
import Link from 'next/link';
import ClienteTabs from './ClienteTabs';
import ClienteEditModal from './ClienteEditModal';
import ClienteStatusButton from './ClienteStatusButton';
import DeleteClienteButton from './DeleteClienteButton';
import ClienteMeasurements from './ClienteMeasurements';
import CrearPlanButton from './CrearPlanButton';
import { ArrowLeft, ChevronRight, Sparkles } from 'lucide-react';

const DAYS_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

const loadClienteData = unstable_cache(
  async (clientId: string, trainerId: string) => {
    const [clienteRows, planRows, latestProgressRows] = await Promise.all([
      db.select().from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.trainerId, trainerId)))
        .limit(1),
      db.select().from(mealPlans)
        .where(and(eq(mealPlans.clientId, clientId), eq(mealPlans.isActive, true)))
        .limit(1),
      db.select().from(progressEntries)
        .where(eq(progressEntries.clientId, clientId))
        .orderBy(desc(progressEntries.recordedAt), desc(progressEntries.createdAt))
        .limit(1),
    ]);

    const cliente = clienteRows[0];
    if (!cliente) return null;

    const [rutina] = await db.select().from(routines)
      .where(and(eq(routines.clientId, clientId), eq(routines.isActive, true)))
      .limit(1);

    let diasRutina: Array<{
      id: string;
      dayOfWeek: string;
      name: string | null;
      orderIndex: number;
      ejercicios: Array<{
        id: string;
        sets: number;
        trackingType?: 'reps' | 'time';
        reps: string | null;
        durationSeconds: number | null;
        weightKg: string | null;
        restSeconds: number | null;
        notes: string | null;
        nameEs: string;
        orderIndex: number;
      }>;
    }> = [];

    if (rutina) {
      const rows = await db
        .select({
          dayId: routineDays.id,
          dayOfWeek: routineDays.dayOfWeek,
          dayName: routineDays.name,
          dayOrder: routineDays.orderIndex,
          exId: routineExercises.id,
          exSets: routineExercises.sets,
          exTrackingType: routineExercises.trackingType,
          exReps: routineExercises.reps,
          exDurationSeconds: routineExercises.durationSeconds,
          exWeightKg: routineExercises.weightKg,
          exRestSeconds: routineExercises.restSeconds,
          exNotes: routineExercises.notes,
          exOrder: routineExercises.orderIndex,
          exNameEs: exercises.nameEs,
        })
        .from(routineDays)
        .leftJoin(routineExercises, eq(routineExercises.routineDayId, routineDays.id))
        .leftJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(eq(routineDays.routineId, rutina.id))
        .orderBy(asc(routineDays.orderIndex), asc(routineExercises.orderIndex));

      const byDay = new Map<string, typeof diasRutina[number]>();
      for (const r of rows) {
        if (!byDay.has(r.dayId)) {
          byDay.set(r.dayId, {
            id: r.dayId,
            dayOfWeek: r.dayOfWeek,
            name: r.dayName,
            orderIndex: r.dayOrder,
            ejercicios: [],
          });
        }
        if (r.exId && r.exNameEs) {
          byDay.get(r.dayId)!.ejercicios.push({
            id: r.exId,
            sets: r.exSets ?? 1,
            trackingType: r.exTrackingType ?? 'reps',
            reps: r.exReps,
            durationSeconds: r.exDurationSeconds,
            weightKg: r.exWeightKg,
            restSeconds: r.exRestSeconds,
            notes: r.exNotes,
            nameEs: r.exNameEs,
            orderIndex: r.exOrder ?? 0,
          });
        }
      }
      diasRutina = Array.from(byDay.values()).sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return {
      cliente,
      rutina: rutina ?? null,
      diasRutina,
      planActivo: planRows[0] ?? null,
      planDias: planRows[0]
        ? await db.select().from(meals).where(eq(meals.mealPlanId, planRows[0].id)).orderBy(asc(meals.dayOfWeek), asc(meals.orderIndex))
        : [],
      ultimoPeso: latestProgressRows[0] ?? null,
    };
  },
  ['cliente-detalle-v4'],
  {
    revalidate: 30,
    tags: ['clientes'],
  },
);

const goalLabels: Record<string, string> = {
  hypertrophy: 'Hipertrofia',
  strength: 'Fuerza',
  fat_loss: 'Perder grasa',
  maintenance: 'Mantener',
  recomp: 'Recomp',
};

const levelLabels: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
};

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const cls = size === 'lg' ? 'h-14 w-14 text-base' : size === 'md' ? 'h-10 w-10 text-sm' : 'h-8 w-8 text-xs';
  return <span className={`avatar ${cls}`}>{initials}</span>;
}

export default async function ClienteDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const trainer = await requireTrainer();
  const data = await loadClienteData(params.id, trainer.id);
  if (!data) notFound();

  // Preparar las medidas más recientes para pasar al modal de edición
  const latestMeasurements = data.ultimoPeso
    ? {
        weightKg: data.ultimoPeso.weightKg ? Number(data.ultimoPeso.weightKg) : null,
        neckCm: data.ultimoPeso.neckCm ? Number(data.ultimoPeso.neckCm) : null,
        waistCm: data.ultimoPeso.waistCm ? Number(data.ultimoPeso.waistCm) : null,
        hipsCm: data.ultimoPeso.hipsCm ? Number(data.ultimoPeso.hipsCm) : null,
        shoulderCm: data.ultimoPeso.shoulderCm ? Number(data.ultimoPeso.shoulderCm) : null,
        chestCm: data.ultimoPeso.chestCm ? Number(data.ultimoPeso.chestCm) : null,
        bicepFlexCm: data.ultimoPeso.bicepFlexCm ? Number(data.ultimoPeso.bicepFlexCm) : null,
        bicepRelaxedCm: data.ultimoPeso.bicepRelaxedCm ? Number(data.ultimoPeso.bicepRelaxedCm) : null,
        forearmCm: data.ultimoPeso.forearmCm ? Number(data.ultimoPeso.forearmCm) : null,
        thighCm: data.ultimoPeso.thighCm ? Number(data.ultimoPeso.thighCm) : null,
        calfCm: data.ultimoPeso.calfCm ? Number(data.ultimoPeso.calfCm) : null,
        bodyFatPct: data.ultimoPeso.bodyFatPct ? Number(data.ultimoPeso.bodyFatPct) : null,
      }
    : null;

  return (
    <div className="space-y-4">
      <Link href="/trainer/clientes" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Clientes
      </Link>

      <div className="card">
        <div className="flex items-start gap-4">
          <Avatar name={data.cliente.fullName} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{data.cliente.fullName}</h1>
            <p className="text-sm text-ink-600 mt-0.5">
              {levelLabels[data.cliente.experienceLevel ?? ''] ?? data.cliente.experienceLevel ?? '?'}
              <span className="text-ink-300 mx-1.5">·</span>
              {goalLabels[data.cliente.goal ?? ''] ?? data.cliente.goal?.replace('_', ' ') ?? 'sin objetivo'}
            </p>
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <code className="text-xs font-mono bg-ink-100 text-ink-700 rounded px-2 py-0.5">
                {data.cliente.inviteCode}
              </code>
              {data.cliente.active ? (
                <span className="badge-green text-[10px]">activo</span>
              ) : (
                <span className="badge-gray text-[10px]">inactivo</span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones: en móvil van apilados debajo del header (full-width),
            en desktop a la derecha en fila (auto-width). El [&_button]:w-full
            fuerza a los botones internos a llenar su wrapper en móvil. */}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2 [&_button]:w-full sm:[&_button]:w-auto">
          <ClienteEditModal
            cliente={{
              id: data.cliente.id,
              fullName: data.cliente.fullName,
              email: data.cliente.email,
              birthDate: data.cliente.birthDate,
              gender: data.cliente.gender,
              heightCm: data.cliente.heightCm,
              goal: data.cliente.goal,
              experienceLevel: data.cliente.experienceLevel,
              monthlyFeePen: data.cliente.monthlyFeePen,
              paymentDueDay: data.cliente.paymentDueDay,
              active: data.cliente.active,
              notes: data.cliente.notes,
              inviteCode: data.cliente.inviteCode,
            }}
            latestMeasurements={latestMeasurements}
          />
          <ClienteStatusButton
            clienteId={data.cliente.id}
            clienteName={data.cliente.fullName}
            active={data.cliente.active}
          />
          <DeleteClienteButton
            clienteId={data.cliente.id}
            clienteName={data.cliente.fullName}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-ink-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">S/ {Number(data.cliente.monthlyFeePen).toFixed(0)}</p>
            <p className="text-[10px] text-ink-500 mt-0.5 uppercase tracking-wide">Cuota</p>
          </div>
          <div>
            <p className="text-lg font-bold">{data.diasRutina.length}</p>
            <p className="text-[10px] text-ink-500 mt-0.5 uppercase tracking-wide">Días/sem</p>
          </div>
        </div>
      </div>

      {/* Medidas corporales (visible + editable) */}
      <ClienteMeasurements
        clienteId={data.cliente.id}
        measurements={latestMeasurements}
        gender={data.cliente.gender}
        heightCm={data.cliente.heightCm ? Number(data.cliente.heightCm) : null}
        birthDate={data.cliente.birthDate ?? null}
      />

      {!data.rutina && (
        <Link
          href={`/trainer/ia?cliente=${data.cliente.id}`}
          className="card-interactive flex items-center gap-3 group bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200"
        >
          <span className="h-10 w-10 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-sm">Crear rutina con IA</p>
            <p className="text-xs text-ink-600 mt-0.5">Genera una rutina personalizada en segundos</p>
          </div>
          <ChevronRight className="w-5 h-5 text-ink-400 group-hover:text-primary-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
      )}

      <ClienteTabs
        clienteId={data.cliente.id}
        DAYS_FULL={DAYS_FULL}
        rutina={data.rutina}
        diasRutina={data.diasRutina}
        planActivo={data.planActivo}
        planDias={data.planDias}
        ultimoPeso={data.ultimoPeso}
      />
    </div>
  );
}