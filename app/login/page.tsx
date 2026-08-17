'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Dumbbell, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

export default function TrainerLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email o contraseña incorrectos');
      router.push('/trainer');
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
      <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-800 to-ink-900 text-white">
        {/* Decoración de fondo */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-500 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-2.5">
            <span className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-bold text-lg tracking-tight">Personalizados</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight">
              Gestiona a tus clientes<br />
              <span className="text-primary-300">como un pro.</span>
            </h1>
            <p className="text-lg text-primary-100/90 leading-relaxed">
              Rutinas, planes de alimentación y progreso en un solo lugar. Diseñado para coaches que se preocupan por cada atleta.
            </p>

            <div className="flex items-center gap-6 pt-4 text-sm text-primary-100/70">
              <div>
                <p className="text-2xl font-bold text-white">IA</p>
                <p className="text-primary-200/80">Rutinas y planes</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div>
                <p className="text-2xl font-bold text-white">US Navy</p>
                <p className="text-primary-200/80">Composición corporal</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-primary-200/60">© 2026 Personalizados · Hecho con cariño en Perú 🇵🇪</p>
        </div>
      </aside>

      {/* Lado derecho - Form */}
      <section className="flex items-center justify-center p-6 sm:p-8 bg-ink-50">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center">
              <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-bold text-ink-900">Personalizados</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">
              Bienvenido de vuelta
            </h2>
            <p className="text-sm text-ink-500">
              Ingresa a tu panel de entrenador
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-ink-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-ink-700">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
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
              disabled={loading || !email || !password}
              className="btn-primary w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-ink-500">
            ¿Eres cliente?{' '}
            <Link href="/portal" className="text-primary-700 hover:text-primary-800 font-semibold">
              Ingresa con tu código
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}