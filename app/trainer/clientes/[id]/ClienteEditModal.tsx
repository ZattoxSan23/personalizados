'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/app/components/Toast';
import BodyMeasurementsInput, { emptyMeasurements, type Measurements } from '@/app/components/BodyMeasurementsInput';

type Cliente = {
  id: string;
  fullName: string;
  email: string | null;
  birthDate: string | null;
  gender: string | null;
  heightCm: string | null;
  goal: string | null;
  experienceLevel: string | null;
  monthlyFeePen: string | null;
  paymentDueDay: number | null;
  active: boolean;
  notes: string | null;
  inviteCode: string;
};

export default function ClienteEditModal({
  cliente,
  latestMeasurements,
}: {
  cliente: Cliente;
  latestMeasurements: Measurements | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Datos estáticos del cliente
  const [fullName, setFullName] = useState(cliente.fullName);
  const [email, setEmail] = useState(cliente.email ?? '');
  const [birthDate, setBirthDate] = useState(cliente.birthDate ?? '');
  const [gender, setGender] = useState(cliente.gender ?? '');
  const [heightCm, setHeightCm] = useState(cliente.heightCm ?? '');
  const [goal, setGoal] = useState(cliente.goal ?? '');
  const [experienceLevel, setExperienceLevel] = useState(cliente.experienceLevel ?? '');
  const [monthlyFeePen, setMonthlyFeePen] = useState(cliente.monthlyFeePen ?? '');
  const [paymentDueDay, setPaymentDueDay] = useState(cliente.paymentDueDay?.toString() ?? '1');
  const [active, setActive] = useState(cliente.active);
  const [notes, setNotes] = useState(cliente.notes ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Medidas corporales - precargadas con las últimas registradas
  const [measurements, setMeasurements] = useState<Measurements>(
    latestMeasurements ?? emptyMeasurements,
  );
  const [includeMeasurements, setIncludeMeasurements] = useState(true);

  function resetForm() {
    setFullName(cliente.fullName);
    setEmail(cliente.email ?? '');
    setBirthDate(cliente.birthDate ?? '');
    setGender(cliente.gender ?? '');
    setHeightCm(cliente.heightCm ?? '');
    setGoal(cliente.goal ?? '');
    setExperienceLevel(cliente.experienceLevel ?? '');
    setMonthlyFeePen(cliente.monthlyFeePen ?? '');
    setPaymentDueDay(cliente.paymentDueDay?.toString() ?? '1');
    setActive(cliente.active);
    setNotes(cliente.notes ?? '');
    setNewPassword('');
    setMeasurements(latestMeasurements ?? emptyMeasurements);
    setError(null);
    setSuccess(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const body: Record<string, unknown> = {
        fullName,
        email: email || null,
        birthDate: birthDate || null,
        gender: gender || null,
        heightCm: heightCm ? Number(heightCm) : null,
        goal: goal || null,
        experienceLevel: experienceLevel || null,
        monthlyFeePen: monthlyFeePen ? Number(monthlyFeePen) : null,
        paymentDueDay: paymentDueDay ? Number(paymentDueDay) : null,
        active,
        notes: notes || null,
      };
      if (newPassword) body.newPassword = newPassword;

      // Solo enviar createProgressEntry si el usuario quiere registrar medidas nuevas
      if (includeMeasurements) {
        const hasAny = Object.values(measurements).some((v) => v != null);
        if (hasAny) body.createProgressEntry = measurements;
      }

      const res = await fetch(`/api/trainer/cliente/${cliente.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');

      let msg = 'Datos actualizados';
      if (data.createdProgressId) msg += ' + medidas registradas';
      if (newPassword) msg += `. Nueva contraseña: "${newPassword}"`;
      setSuccess(msg);
      toast(
        'success',
        newPassword
          ? 'Contraseña actualizada'
          : data.createdProgressId
          ? 'Cliente y medidas guardados'
          : 'Cliente actualizado',
      );
      setNewPassword('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      toast('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-secondary text-xs"
      >
        ✏️ Editar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={submit} className="p-5 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-white pb-2 border-b border-ink-100 z-10">
                <h3 className="font-bold text-lg">Editar cliente</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-ink-400 hover:text-ink-700 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Datos básicos */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Nombre completo *</label>
                  <input
                    type="text"
                    className="input"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Fecha nacimiento</label>
                    <input
                      type="date"
                      className="input"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Género</label>
                    <select
                      className="input"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="male">Masculino</option>
                      <option value="female">Femenino</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Altura (cm)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                      placeholder="ej: 175"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Objetivo</label>
                    <select
                      className="input"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="hypertrophy">Hipertrofia</option>
                      <option value="strength">Fuerza</option>
                      <option value="fat_loss">Pérdida de grasa</option>
                      <option value="maintenance">Mantenimiento</option>
                      <option value="recomp">Recomp</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Nivel</label>
                    <select
                      className="input"
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                    >
                      <option value="">—</option>
                      <option value="beginner">Principiante</option>
                      <option value="intermediate">Intermedio</option>
                      <option value="advanced">Avanzado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Cuota mensual (S/)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input"
                      value={monthlyFeePen}
                      onChange={(e) => setMonthlyFeePen(e.target.value)}
                      placeholder="ej: 150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-ink-700">Día de pago</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="input"
                      value={paymentDueDay}
                      onChange={(e) => setPaymentDueDay(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1 text-ink-700">Notas</label>
                  <textarea
                    className="input min-h-[60px]"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Lesiones, alergias, preferencias..."
                    maxLength={500}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded"
                  />
                  Cliente activo
                </label>
              </div>

              {/* Medidas corporales */}
              <div className="pt-3 border-t border-ink-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold">📏 Medidas corporales</h4>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {latestMeasurements
                        ? 'Últimas registradas. Modifica y guarda para crear un nuevo registro.'
                        : 'Sin medidas previas. Ingresa y guarda para crear el primer registro.'}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={includeMeasurements}
                      onChange={(e) => setIncludeMeasurements(e.target.checked)}
                      className="rounded"
                    />
                    Registrar medidas
                  </label>
                </div>
                {includeMeasurements && (
                  <BodyMeasurementsInput
                    gender={gender || null}
                    heightCm={heightCm ? Number(heightCm) : null}
                    birthDate={birthDate || null}
                    value={measurements}
                    onChange={setMeasurements}
                  />
                )}
              </div>

              {/* Sección contraseña */}
              <div className="pt-3 border-t border-ink-100">
                <h4 className="text-sm font-semibold mb-2">🔑 Cambiar contraseña (código de acceso)</h4>
                <p className="text-xs text-ink-500 mb-2">
                  Actual: <code className="bg-ink-100 rounded px-1.5 py-0.5">{cliente.inviteCode}</code>
                </p>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input font-mono flex-1"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (déjala vacía para no cambiar)"
                    minLength={4}
                    maxLength={20}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-secondary text-xs whitespace-nowrap"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="text-[10px] text-ink-400 mt-1">
                  Esta será la nueva contraseña que el cliente usará para entrar al portal.
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-lg bg-primary-50 border border-primary-200 p-2 text-sm text-primary-800">
                  {success}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => { resetForm(); setOpen(false); }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}