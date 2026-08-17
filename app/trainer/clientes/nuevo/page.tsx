import Link from 'next/link';
import { requireTrainer } from '@/lib/auth';
import NuevoClienteForm from './NuevoClienteForm';
import { ArrowLeft, UserPlus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NuevoClientePage() {
  await requireTrainer();

  return (
    <div className="space-y-5">
      <Link
        href="/trainer/clientes"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Cancelar
      </Link>

      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
            Nuevo cliente
          </h1>
        </div>
        <p className="text-sm text-ink-500">
          Completa los datos. Si ingresas medidas básicas, calculamos el % de grasa automáticamente (US Navy).
        </p>
      </header>

      <NuevoClienteForm />
    </div>
  );
}