'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, KeyRound, ArrowRight, Loader2 } from 'lucide-react';

export default function ClientLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/client-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido o cliente inactivo');
      router.push('/portal/hoy');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Lado izquierdo - Branding */}
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-primary-900 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/3 -left-20 w-96 h-96 bg-primary-500 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-10 w-80 h-80 bg-accent-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-bold text-lg tracking-tight">Personalizados</span>
          </Link>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
              Tu coach,<br />
              <span className="text-primary-300">en tu bolsillo.</span>
            </h1>
            <p className="text-lg text-ink-100/90 leading-relaxed">
              Ve tu rutina del día, sigue tu plan de alimentación y registra tus pesos. Todo desde tu celular.
            </p>

            <div className="flex items-center gap-6 pt-4 text-sm text-ink-100/70">
              <div>
                <p className="text-2xl font-bold text-white">7d</p>
                <p className="text-ink-200/80">Rutinas</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">PR</p>
                <p className="text-ink-200/80">Historial</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">PRO</p>
                <p className="text-ink-200/80">Progreso</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-ink-200/60">© 2026 Personalizados</p>
        </div>
      </aside>

      {/* Lado derecho - Form */}
      <section className="flex items-center justify-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2.5 lg:hidden">
            <span className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center">
              <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-bold text-ink-900">Personalizados</span>
          </Link>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">
              Hola, atleta
            </h2>
            <p className="text-sm text-ink-500">
              Ingresa el código que te dio tu coach
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="code" className="block text-sm font-medium text-ink-700">
                Código de invitación
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
                <input
                  id="code"
                  type="text"
                  required
                  autoFocus
                  autoCapitalize="characters"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="input pl-10 text-center font-mono text-lg tracking-widest uppercase"
                  placeholder="JP-1234"
                  maxLength={20}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-ink-500">
            ¿Eres entrenador?{' '}
            <Link href="/login" className="text-primary-700 hover:text-primary-800 font-semibold">
              Ingresa al panel
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}