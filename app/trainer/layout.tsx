import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Home, Users, Sparkles, CreditCard, LogOut, Bell } from 'lucide-react';
import { Logo } from '@/app/components/Logo';
import { ToastContainer } from '@/app/components/Toast';

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'trainer') redirect('/login');

  const navItems = [
    { href: '/trainer', label: 'Inicio', icon: Home },
    { href: '/trainer/clientes', label: 'Clientes', icon: Users },
    { href: '/trainer/ia', label: 'IA', icon: Sparkles },
    { href: '/trainer/pagos', label: 'Pagos', icon: CreditCard },
  ];

  const initials = user.fullName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl min-h-screen pb-28 sm:pb-24 pt-safe">
      <header className="sticky top-0 z-10 bg-white/85 backdrop-blur-lg border-b border-ink-200/60">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          <Link href="/trainer" className="group">
            <Logo size={32} className="text-primary-700 group-hover:text-primary-800 transition-colors" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-icon relative"
              aria-label="Notificaciones"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 bg-accent-500 rounded-full" />
            </button>
            <Link
              href="/trainer/configuracion"
              className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
              title="Configuración"
            >
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-ink-900 leading-none">{user.fullName.split(' ')[0]}</span>
                <span className="text-[10px] text-ink-500 mt-0.5">entrenador</span>
              </div>
              <span
                className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-card"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #15a05a 0%, #084328 100%)',
                }}
              >
                {initials}
              </span>
            </Link>
            <span
              className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-card sm:hidden"
              style={{
                backgroundImage: 'linear-gradient(135deg, #15a05a 0%, #084328 100%)',
              }}
            >
              {initials}
            </span>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="btn-icon" aria-label="Cerrar sesión">
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="px-4 sm:px-6 py-5 sm:py-6 animate-fade-in">
        {children}
      </main>

      <ToastContainer />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-xl border-t border-ink-200/60 mx-auto max-w-3xl pb-safe">
        <div className="grid grid-cols-4 px-1 py-1.5">
          {navItems.map((item) => {
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
    </div>
  );
}