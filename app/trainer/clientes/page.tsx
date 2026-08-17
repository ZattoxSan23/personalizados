import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { UserPlus, ArrowRight, Users, Search } from 'lucide-react';

export const revalidate = 30;

const getClientes = unstable_cache(
  async (trainerId: string) =>
    db.select().from(clients)
      .where(eq(clients.trainerId, trainerId))
      .orderBy(desc(clients.createdAt)),
  ['trainer-clientes-list-v2'],
  { revalidate: 30, tags: ['clientes-list'] },
);

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const cls = size === 'lg' ? 'h-12 w-12 text-base' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return <span className={`avatar ${cls}`}>{initials}</span>;
}

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

export default async function TrainerClientesPage() {
  const trainer = await requireTrainer();
  const allClients = await getClientes(trainer.id);
  const active = allClients.filter((c) => c.active);
  const inactive = allClients.filter((c) => !c.active);

  return (
    <div className="space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mis clientes</h1>
          <p className="text-ink-500 text-sm mt-0.5">
            {active.length} activo{active.length !== 1 ? 's' : ''}{inactive.length > 0 && ` · ${inactive.length} inactivo${inactive.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link href="/trainer/clientes/nuevo" className="btn-primary text-sm">
          <UserPlus className="w-4 h-4" /> Nuevo
        </Link>
      </header>

      {allClients.length === 0 ? (
        <div className="empty-state">
          <span className="h-14 w-14 rounded-full bg-ink-100 mx-auto flex items-center justify-center">
            <Users className="w-7 h-7 text-ink-400" />
          </span>
          <p className="text-sm font-medium text-ink-700">Aún no tienes clientes</p>
          <p className="text-xs text-ink-500 max-w-xs mx-auto">
            Agrega tu primer cliente para empezar a asignar rutinas y planes.
          </p>
          <Link href="/trainer/clientes/nuevo" className="btn-primary inline-flex">
            <UserPlus className="w-4 h-4" /> Agregar primer cliente
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {allClients.map((c) => (
            <Link
              key={c.id}
              href={`/trainer/clientes/${c.id}`}
              prefetch={false}
              className="card-interactive flex items-center gap-3 group"
            >
              <Avatar name={c.fullName} size="md" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-ink-900 truncate">{c.fullName}</p>
                  {!c.active && <span className="badge-gray text-[10px]">inactivo</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-500">
                  <span>{goalLabels[c.goal ?? ''] ?? c.goal?.replace('_', ' ') ?? 'sin objetivo'}</span>
                  <span className="text-ink-300">·</span>
                  <span>{levelLabels[c.experienceLevel ?? ''] ?? c.experienceLevel ?? 'nivel ?'}</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-ink-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}