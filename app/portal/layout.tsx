import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { CalendarDays, Dumbbell, UtensilsCrossed, LineChart, CreditCard, LogOut, Bell } from 'lucide-react';
import { Logo } from '@/app/components/Logo';

const NAV = [
  { href: '/portal/hoy', label: 'Hoy', icon: CalendarDays, accent: 'primary' },
  { href: '/portal/rutina', label: 'Rutina', icon: Dumbbell, accent: 'primary' },
  { href: '/portal/alimentacion', label: 'Plan', icon: UtensilsCrossed, accent: 'accent' },
  { href: '/portal/progreso', label: 'Progreso', icon: LineChart, accent: 'primary' },
  { href: '/portal/pagos', label: 'Pagos', icon: CreditCard, accent: 'primary' },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  let clienteName: string | null = null;
  let initials = '';

  if (session && session.role === 'client' && session.clientId) {
    const [cliente] = await db
      .select({ fullName: clients.fullName })
      .from(clients)
      .where(eq(clients.id, session.clientId))
      .limit(1);
    clienteName = cliente?.fullName ?? null;
    initials = (clienteName ?? '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  const isAuthenticated = !!clienteName;

  return (
    <div className="mx-auto max-w-3xl min-h-screen pb-28 sm:pb-24 pt-safe relative">
      {isAuthenticated && (
        <>
          {/* Header con glass + gradiente sutil */}
          <header className="sticky top-0 z-10 bg-white/75 backdrop-blur-xl border-b border-ink-200/50 shadow-xs">
            <div className="flex items-center justify-between px-5 py-3">
              <Link href="/portal/hoy" className="group">
                <Logo size={32} className="text-primary-700 group-hover:text-primary-800 transition-colors" />
              </Link>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="btn-icon relative"
                  aria-label="Notificaciones"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-accent-500 rounded-full" />
                </button>
                <Link
                  href="/portal/configuracion"
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  title="Mi perfil"
                >
                  <span className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-semibold text-ink-900 leading-none">
                      {clienteName!.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-ink-500 mt-0.5">cliente</span>
                  </span>
                  <span
                    className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-card"
                    style={{
                      backgroundImage: 'linear-gradient(135deg, #15a05a 0%, #084328 100%)',
                    }}
                  >
                    {initials}
                  </span>
                </Link>
                <form action="/api/auth/logout" method="POST">
                  <button type="submit" className="btn-icon" aria-label="Cerrar sesión">
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </header>

          {/* Nav inferior con animación de tab activo */}
          <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white/85 backdrop-blur-xl border-t border-ink-200/60 mx-auto max-w-3xl pb-safe">
            <div className="grid grid-cols-5 px-1 py-1.5">
              {NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group flex flex-col items-center gap-0.5 py-2 text-xs text-ink-500 hover:text-primary-700 transition-colors"
                  >
                    <span className="flex items-center justify-center w-10 h-7 rounded-lg group-hover:bg-primary-50 group-active:scale-95 transition-all">
                      <Icon className="w-5 h-5" strokeWidth={2} />
                    </span>
                    <span className="font-semibold">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </>
      )}
      <main className={isAuthenticated ? 'px-4 sm:px-6 py-5 sm:py-6 animate-fade-in' : ''}>
        {children}
      </main>
    </div>
  );
}