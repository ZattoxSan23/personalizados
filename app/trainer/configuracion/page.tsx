import { requireTrainer } from '@/lib/auth';
import ConfiguracionForm from './ConfiguracionForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const trainer = await requireTrainer();

  return (
    <div className="space-y-5">
      <Link
        href="/trainer"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink-900">
          Configuración
        </h1>
        <p className="text-ink-500 text-sm">
          Edita tu información personal y credenciales
        </p>
      </header>

      <ConfiguracionForm
        currentName={trainer.fullName}
        currentEmail={trainer.email}
        currentPhone={trainer.phone ?? ''}
      />
    </div>
  );
}