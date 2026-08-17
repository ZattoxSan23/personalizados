'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Eye, EyeOff, Loader2, Check } from 'lucide-react';

export default function ConfiguracionForm({
  currentName,
  currentEmail,
  currentPhone,
}: {
  currentName: string;
  currentEmail: string;
  currentPhone: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [phone, setPhone] = useState(currentPhone);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  const wantsSensitive = email !== currentEmail || newPassword.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const body: Record<string, unknown> = {
        fullName,
        email,
        phone: phone || null,
      };
      if (wantsSensitive) {
        body.currentPassword = currentPassword;
        if (newPassword) body.newPassword = newPassword;
      }

      const res = await fetch('/api/trainer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');

      setSuccess(true);
      setNewPassword('');
      setCurrentPassword('');
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-5">
      {/* Datos personales */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Datos personales
        </h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink-700">Nombre completo</label>
          <input
            type="text"
            className="input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            maxLength={120}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink-700">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink-700">Teléfono</label>
            <input
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+51 999 999 999"
              maxLength={30}
            />
          </div>
        </div>
      </section>

      {/* Cambiar contraseña */}
      <section className="space-y-3 pt-3 border-t border-ink-100">
        <h2 className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
          Cambiar contraseña
        </h2>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-ink-700">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              className="input pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Déjala vacía para no cambiar"
              minLength={6}
              maxLength={100}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400 hover:text-ink-700"
              aria-label="Mostrar contraseña"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-ink-500">Mínimo 6 caracteres</p>
        </div>

        {wantsSensitive && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-ink-700">
              Contraseña actual <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                className="input pr-10"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Requerida para confirmar email o contraseña"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-ink-400 hover:text-ink-700"
                aria-label="Mostrar contraseña actual"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-ink-500">
              Por seguridad, confirma tu contraseña para cambiar email o contraseña.
            </p>
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700 animate-fade-in">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-primary-50 border border-primary-200 p-3 text-sm text-primary-800 flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          Datos actualizados correctamente
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex-1 sm:flex-none sm:px-8"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </form>
  );
}