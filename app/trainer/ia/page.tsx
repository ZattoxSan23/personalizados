import { requireTrainer } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import AIChat from './AIChat';

export const revalidate = 30;

const getTrainerClientsLite = unstable_cache(
  async (trainerId: string) =>
    db.select({
      id: clients.id,
      fullName: clients.fullName,
      goal: clients.goal,
      experienceLevel: clients.experienceLevel,
    })
      .from(clients)
      .where(eq(clients.trainerId, trainerId)),
  ['trainer-clients-lite-v1'],
  { revalidate: 30, tags: ['clientes-list'] },
);

export default async function TrainerIAPage({
  searchParams,
}: {
  searchParams: { cliente?: string; modo?: string };
}) {
  await requireTrainer();
  const trainer = await requireTrainer();

  const trainerClients = await getTrainerClientsLite(trainer.id);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold mb-1">✨ Asistente IA</h1>
        <p className="text-ink-600 text-sm">
          Dile a la IA qué necesitas. Te propone una rutina o plan que puedes editar antes de publicar.
        </p>
      </div>

      {trainerClients.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-ink-500 mb-4">Necesitas al menos un cliente</p>
          <Link href="/trainer/clientes/nuevo" className="btn-primary">
            Agregar cliente
          </Link>
        </div>
      ) : (
        <AIChat
          clients={trainerClients.map((c) => ({ id: c.id, name: c.fullName, goal: c.goal, level: c.experienceLevel }))}
          initialClientId={searchParams.cliente ?? null}
          initialMode={(searchParams.modo as 'routine' | 'meal_plan') ?? 'routine'}
        />
      )}
    </div>
  );
}