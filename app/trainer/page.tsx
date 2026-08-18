import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients, payments } from '@/lib/db/schema';
import { todayKeyInLima } from '@/lib/date';
import { and, eq, gte, sql } from 'drizzle-orm';
import {
  Users,
  Wallet,
  Receipt,
  Sparkles,
  UserPlus,
  ArrowRight,
  CircleDollarSign,
} from 'lucide-react';

export const revalidate = 30;

async function loadDashboardData(trainerId: string) {
  // ⚠️ "Hoy" e "inicio de mes" en zona horaria Lima (no UTC del servidor).
  const today = todayKeyInLima();
  const startOfMonth = today.slice(0, 7);

  // `today` puede usarse en el futuro para features de "hoy"
  void today;
  const [allClients, pendingPayments, ingresosRow] = await Promise.all([
    db.select().from(clients).where(eq(clients.trainerId, trainerId)),
    db.select().from(payments).where(and(
      eq(payments.trainerId, trainerId),
      eq(payments.status, 'pending'),
    )),
    db.select({ total: sql<string>`COALESCE(SUM(${payments.amountPen}), 0)` })
      .from(payments)
      .where(and(
        eq(payments.trainerId, trainerId),
        eq(payments.status, 'validated'),
        gte(payments.periodMonth, startOfMonth),
      )),
  ]);

  return {
    allClients,
    activeClients: allClients.filter((c) => c.active),
    pendingPayments,
    ingresosTotal: ingresosRow[0]?.total ?? '0',
  };
}

const getDashboardData = unstable_cache(
  async (trainerId: string) => loadDashboardData(trainerId),
  ['trainer-dashboard-v3'],
  { revalidate: 30, tags: ['trainer-dashboard'] },
);

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const cls = size === 'lg' ? 'h-12 w-12 text-base' : size === 'md' ? 'h-9 w-9 text-xs' : 'h-7 w-7 text-[10px]';
  return <span className={`avatar-emerald ${cls} flex-shrink-0`}>{initials}</span>;
}

export default async function TrainerDashboard() {
  const trainer = await requireTrainer();
  const data = await getDashboardData(trainer.id);

  const kpis: Array<{
  label: string;
  value: string | number;
  sub: string;
  icon: any;
  tone: 'primary' | 'success' | 'amber' | 'danger' | 'slate';
  href?: string;
}> = [
    {
      label: 'Clientes activos',
      value: data.activeClients.length,
      sub: `de ${data.allClients.length} totales`,
      icon: Users,
      tone: 'primary',
    },
    {
      label: 'Ingresos del mes',
      value: `S/ ${Number(data.ingresosTotal).toFixed(0)}`,
      sub: 'validado',
      icon: CircleDollarSign,
      tone: 'success',
    },
    {
      label: 'Pagos por validar',
      value: data.pendingPayments.length,
      sub: data.pendingPayments.length > 0 ? 'requieren revisión' : 'al día',
      icon: Receipt,
      tone: data.pendingPayments.length > 0 ? 'danger' : 'slate',
      href: '/trainer/pagos',
    },
  ];

  const toneClasses = {
    primary: 'text-primary-700 bg-primary-50',
    success: 'text-success bg-emerald-50',
    amber: 'text-accent-700 bg-accent-50',
    danger: 'text-red-700 bg-red-50',
    slate: 'text-ink-500 bg-ink-100',
  } as const;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="space-y-1">
        <p className="eyebrow">Bienvenido</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink-900">
          Hola, {trainer.fullName.split(' ')[0]}
        </h1>
        <p className="text-ink-500 text-sm sm:text-base mt-1">Aquí está tu resumen de hoy</p>
      </header>

      {/* KPIs - 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const accent = toneClasses[kpi.tone as keyof typeof toneClasses];
          const Wrapper: any = kpi.href ? Link : 'div';
          const wrapperProps: any = kpi.href ? { href: kpi.href } : {};
          return (
            <Wrapper
              key={kpi.label}
              {...wrapperProps}
              className="kpi-card space-y-2 sm:space-y-3"
            >
              <div className="flex items-start justify-between">
                <span className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center ${accent}`}>
                  <Icon className="w-5 h-5" strokeWidth={2} />
                </span>
                {kpi.href && (
                  <ArrowRight className="w-4 h-4 text-ink-300" />
                )}
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900 tabular-nums">
                  {kpi.value}
                </p>
                <p className="text-xs sm:text-sm font-semibold text-ink-700 mt-0.5">{kpi.label}</p>
                <p className="text-[10px] sm:text-xs text-ink-500 mt-0.5">{kpi.sub}</p>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* Acciones rápidas */}
      <section className="space-y-3">
        <p className="eyebrow">Acciones rápidas</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link href="/trainer/ia" className="kpi-card group">
            <span className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white flex items-center justify-center shadow-primary-glow group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" strokeWidth={2} />
            </span>
            <div className="mt-3">
              <p className="font-bold text-ink-900">Crear con IA</p>
              <p className="text-xs text-ink-500 mt-0.5">Rutina o plan automático</p>
            </div>
          </Link>
          <Link href="/trainer/clientes/nuevo" className="kpi-card group">
            <span className="h-12 w-12 rounded-xl bg-gradient-to-br from-ink-800 to-ink-900 text-white flex items-center justify-center shadow-card group-hover:scale-105 transition-transform">
              <UserPlus className="w-6 h-6" strokeWidth={2} />
            </span>
            <div className="mt-3">
              <p className="font-bold text-ink-900">Nuevo cliente</p>
              <p className="text-xs text-ink-500 mt-0.5">Generar código</p>
            </div>
          </Link>
        </div>
      </section>

      {/* Lista de clientes activos */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Tus clientes</p>
          {data.activeClients.length > 5 && (
            <Link href="/trainer/clientes" className="text-xs text-primary-700 hover:text-primary-800 font-semibold inline-flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        {data.activeClients.length === 0 ? (
          <div className="empty-state">
            <span className="h-14 w-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
              <Users className="w-7 h-7 text-ink-400" />
            </span>
            <p className="font-bold text-ink-900">Aún no tienes clientes</p>
            <p className="text-xs text-ink-500 max-w-xs mx-auto">
              Agrega tu primer cliente para empezar a asignar rutinas y planes.
            </p>
            <Link href="/trainer/clientes/nuevo" className="btn-primary inline-flex">
              <UserPlus className="w-4 h-4" /> Agregar primer cliente
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data.activeClients.slice(0, 5).map((c) => (
              <Link
                key={c.id}
                href={`/trainer/clientes/${c.id}`}
                prefetch={false}
                className="card-interactive flex items-center gap-3 group"
              >
                <Avatar name={c.fullName} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{c.fullName}</p>
                  <p className="text-xs text-ink-500 mt-0.5 truncate">
                    {c.goal?.replace('_', ' ') ?? 'sin objetivo'} · {c.experienceLevel ?? 'nivel ?'}
                  </p>
                </div>
                <span className="text-ink-300 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="w-5 h-5" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}