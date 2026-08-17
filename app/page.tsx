import Link from 'next/link';
import { Dumbbell, ArrowRight, Sparkles, Users, TrendingUp } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header simple */}
      <header className="px-6 py-4">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-9 w-9 rounded-lg bg-primary-600 text-white flex items-center justify-center shadow-primary-glow">
              <Dumbbell className="w-5 h-5" strokeWidth={2.5} />
            </span>
            <span className="font-bold text-ink-900 tracking-tight">Personalizados</span>
          </Link>
          <Link
            href="/login"
            className="text-sm text-ink-600 hover:text-ink-900 font-medium"
          >
            ¿Ya tienes cuenta? Ingresa →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center px-6 py-12 sm:py-20">
        <div className="mx-auto max-w-5xl w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Copy */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold ring-1 ring-primary-200">
                <Sparkles className="w-3.5 h-3.5" />
                Coach Personal · Hecho en Perú
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-900 leading-[1.05]">
                La app para<br />
                <span className="text-primary-600">coaches personales</span><br />
                que se toman en serio.
              </h1>

              <p className="text-lg text-ink-500 max-w-md leading-relaxed">
                Crea rutinas y planes de alimentación con IA, registra el progreso de cada cliente, mide composición corporal con el método US Navy. Todo en un solo lugar.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/login" className="btn-primary text-base py-3 px-6">
                  Soy entrenador
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/portal" className="btn-secondary text-base py-3 px-6">
                  Soy cliente
                </Link>
              </div>

              <p className="text-xs text-ink-400 pt-2">
                Demo: <code className="font-mono">entrenador@personalizados.pe</code> ·{' '}
                <code className="font-mono">entrenador123</code> · Cliente: <code className="font-mono">SANTOS2026</code>
              </p>
            </div>

            {/* Visual mockup */}
            <div className="relative hidden lg:block">
              <div className="absolute -inset-8 bg-gradient-to-br from-primary-200/40 via-accent-200/30 to-primary-300/30 blur-3xl rounded-3xl" />
              <div className="relative card space-y-3 shadow-card-hover">
                <div className="flex items-center gap-3">
                  <span className="avatar-emerald h-10 w-10 text-sm flex-shrink-0">SM</span>
                  <div>
                    <p className="font-semibold text-ink-900">Santos Mejía Vasquez</p>
                    <p className="text-xs text-ink-500">advanced · hypertrophy</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-primary-50 py-2">
                    <p className="text-lg font-bold text-primary-700">3250</p>
                    <p className="text-[10px] text-ink-500 uppercase">kcal</p>
                  </div>
                  <div className="rounded-lg bg-ink-50 py-2">
                    <p className="text-lg font-bold">160g</p>
                    <p className="text-[10px] text-ink-500 uppercase">Proteína</p>
                  </div>
                  <div className="rounded-lg bg-ink-50 py-2">
                    <p className="text-lg font-bold">14.5%</p>
                    <p className="text-[10px] text-ink-500 uppercase">Grasa</p>
                  </div>
                </div>
                <div className="rounded-lg bg-ink-50 p-3 space-y-1.5">
                  <p className="text-[10px] text-ink-500 uppercase tracking-wider font-semibold">Rutina de hoy · Push</p>
                  <div className="flex items-center justify-between text-xs">
                    <span>Press banca plano</span>
                    <span className="font-semibold tabular-nums">70kg × 6</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Press inclinado</span>
                    <span className="font-semibold tabular-nums">60kg × 8</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span>Elevaciones laterales</span>
                    <span className="font-semibold tabular-nums">12kg × 12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid sm:grid-cols-3 gap-4 mt-16 sm:mt-24">
            <FeatureCard
              icon={Sparkles}
              title="IA integrada"
              description="Genera rutinas y planes en segundos, basados en medidas reales."
            />
            <FeatureCard
              icon={Users}
              title="Por cliente"
              description="Editor de medidas con US Navy. Cada atleta tiene su plan."
            />
            <FeatureCard
              icon={TrendingUp}
              title="Progreso real"
              description="Historial de pesos, medidas y composición corporal con tendencias."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-ink-200">
        <div className="mx-auto max-w-5xl text-center text-xs text-ink-500">
          Hecho con cariño en Perú 🇵🇪 · Personalizados © 2026
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="card space-y-2">
      <span className="h-10 w-10 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center">
        <Icon className="w-5 h-5" strokeWidth={2} />
      </span>
      <h3 className="font-bold text-ink-900">{title}</h3>
      <p className="text-sm text-ink-500 leading-relaxed">{description}</p>
    </div>
  );
}