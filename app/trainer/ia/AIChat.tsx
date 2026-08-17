'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ClientOpt {
  id: string;
  name: string;
  goal: string | null;
  level: string | null;
}

interface ToolPayload {
  name: 'create_routine' | 'create_meal_plan';
  input: any;
}

export default function AIChat({
  clients,
  initialClientId,
  initialMode,
}: {
  clients: ClientOpt[];
  initialClientId: string | null;
  initialMode: 'routine' | 'meal_plan';
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState<string | null>(initialClientId);
  const [mode, setMode] = useState<'routine' | 'meal_plan'>(initialMode);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; tool?: ToolPayload | null }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);

  async function send() {
    if (!input.trim()) return;

    const userMsg = { role: 'user' as const, content: input };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          clientId,
          sessionId,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSessionId(data.sessionId);
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: data.reply, tool: data.tool },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `❌ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function publishTool(tool: ToolPayload, prompt: string) {
    if (!clientId) {
      alert('Selecciona un cliente primero');
      return;
    }
    setPublishing(true);
    try {
      const res = await fetch('/api/ai/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          toolName: tool.name,
          payload: tool.input,
          aiPrompt: prompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPublished(tool.name === 'create_routine' ? 'Rutina publicada ✅' : 'Plan publicado ✅');
      setTimeout(() => {
        router.push(`/trainer/clientes/${clientId}`);
        router.refresh();
      }, 1500);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Selector de cliente + modo */}
      <div className="card space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1.5 text-ink-700">Cliente</label>
          <select
            className="input"
            value={clientId ?? ''}
            onChange={(e) => setClientId(e.target.value || null)}
          >
            <option value="">— Selecciona —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('routine')}
            className={`flex-1 text-sm py-2 rounded-lg border ${
              mode === 'routine' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white'
            }`}
          >
            💪 Rutina
          </button>
          <button
            onClick={() => setMode('meal_plan')}
            className={`flex-1 text-sm py-2 rounded-lg border ${
              mode === 'meal_plan' ? 'bg-primary-600 text-white border-primary-600' : 'bg-white'
            }`}
          >
            🥗 Nutrición
          </button>
        </div>
      </div>

      {/* Conversación */}
      <div className="space-y-2">
        {messages.length === 0 && (
          <div className="card bg-ink-50 text-sm text-ink-700 space-y-2">
            <p className="font-semibold">💡 Sugerencias para empezar:</p>
            <ul className="space-y-1 text-xs">
              {selectedClient ? (
                <>
                  <li>• "Crea una rutina de hipertrofia para {selectedClient.name}, 4 días, con enfoque en tren superior"</li>
                  <li>• "Plan de alimentación de 2200 kcal para {selectedClient.name}, rico en proteínas"</li>
                  <li>• "Quiero mejorar la fuerza de pierna de {selectedClient.name}, dame 3 días por semana"</li>
                </>
              ) : (
                <>
                  <li>• Selecciona un cliente y describe qué necesitas</li>
                  <li>• "Crea rutina fullbody para principiante, 3 días"</li>
                  <li>• "Plan cutting 2000 kcal para hombre de 80kg"</li>
                </>
              )}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`card ${
              m.role === 'user' ? 'bg-primary-50 border-primary-200 ml-8' : 'bg-white mr-8'
            }`}
          >
            <p className="text-xs text-ink-500 mb-1">
              {m.role === 'user' ? 'Tú' : '✨ IA'}
            </p>
            <p className="text-sm whitespace-pre-wrap">{m.content}</p>

            {m.tool && (
              <div className="mt-3 pt-3 border-t border-ink-100">
                <p className="text-xs font-semibold mb-2 text-primary-700">
                  {m.tool.name === 'create_routine' ? '🏋️ Rutina propuesta' : '🥗 Plan propuesto'}
                </p>
                <ToolPreview tool={m.tool} />
                {clientId && (
                  <button
                    onClick={() => {
                      const userPrompt = messages
                        .filter((x) => x.role === 'user')
                        .slice(-1)[0]?.content ?? '';
                      publishTool(m.tool!, userPrompt);
                    }}
                    disabled={publishing}
                    className="btn-primary w-full mt-3 text-sm"
                  >
                    {publishing ? 'Publicando...' : `✅ Publicar a ${selectedClient?.name}`}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="card mr-8">
            <p className="text-xs text-ink-500 mb-1">✨ Claude</p>
            <p className="text-xs text-ink-500 mb-1">✨ IA</p>
            <p className="text-sm text-ink-400">
              <span className="inline-block animate-pulse">Pensando...</span>
            </p>
          </div>
        )}
      </div>

      {published && (
        <div className="rounded-lg bg-primary-100 border border-primary-300 p-3 text-sm text-primary-800 text-center">
          {published} Redirigiendo...
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-16 -mx-4 px-4 pt-2 pb-3 bg-gradient-to-t from-ink-50 to-transparent">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="input"
            placeholder="Escribe tu instrucción..."
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()} className="btn-primary">
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolPreview({ tool }: { tool: ToolPayload }) {
  const input = tool.input as any;
  if (tool.name === 'create_routine') {
    return (
      <div className="space-y-2 text-xs">
        <p className="font-semibold">{input.title}</p>
        {input.days?.map((d: any, i: number) => (
          <div key={i} className="bg-ink-50 rounded p-2">
            <p className="font-medium capitalize mb-1">
              {d.day_of_week} — {d.name}
            </p>
            <ul className="space-y-0.5 text-ink-700">
              {d.exercises?.map((ex: any, j: number) => (
                <li key={j}>
                  {j + 1}. Ejercicio #{ex.exercise_id?.slice(-6)}: {ex.sets}×{ex.reps} ({ex.rest_seconds}s)
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  if (tool.name === 'create_meal_plan') {
    const days = input.days ?? [];
    return (
      <MealPlanPreview
        title={input.title}
        dailyCalories={input.daily_calories}
        protein={input.daily_protein_g}
        carbs={input.daily_carbs_g}
        fats={input.daily_fats_g}
        days={days}
      />
    );
  }

  return null;
}

const MEAL_LABELS_PREVIEW: Record<string, string> = {
  desayuno: '🌅 Desayuno',
  almuerzo: '🍱 Almuerzo',
  cena: '🌙 Cena',
  snack1: '🥜 Snack AM',
  snack2: '🥜 Snack PM',
};

const DAYS_ORDER_PREVIEW = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAYS_SHORT_PREVIEW = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function MealPlanPreview({
  title,
  dailyCalories,
  protein,
  carbs,
  fats,
  days,
}: {
  title: string;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fats: number;
  days: any[];
}) {
  const [expanded, setExpanded] = useState(true);

  const orderedDays = DAYS_ORDER_PREVIEW.map((key) =>
    days.find((d: any) => d.day_of_week === key),
  ).filter(Boolean);

  const dayKcalSum = (day: any) =>
    (day.meals ?? []).reduce((sum: number, m: any) => sum + (m.calories ?? 0), 0);

  return (
    <div className="space-y-2.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm text-ink-900 leading-tight">{title}</p>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-primary-700 hover:text-primary-800 font-semibold whitespace-nowrap"
        >
          {expanded ? 'Ocultar ▲' : `Ver ${days.length} días ▼`}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-md bg-primary-50 py-1.5 px-1">
          <p className="text-base font-extrabold text-primary-700 tabular-nums leading-tight">{dailyCalories}</p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">kcal</p>
        </div>
        <div className="rounded-md bg-ink-50 py-1.5 px-1">
          <p className="text-base font-bold tabular-nums leading-tight">{protein}<span className="text-[10px] font-normal text-ink-500">g</span></p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">Proteína</p>
        </div>
        <div className="rounded-md bg-ink-50 py-1.5 px-1">
          <p className="text-base font-bold tabular-nums leading-tight">{carbs}<span className="text-[10px] font-normal text-ink-500">g</span></p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">Carbos</p>
        </div>
        <div className="rounded-md bg-ink-50 py-1.5 px-1">
          <p className="text-base font-bold tabular-nums leading-tight">{fats}<span className="text-[10px] font-normal text-ink-500">g</span></p>
          <p className="text-[9px] text-ink-500 uppercase tracking-wider mt-0.5">Grasas</p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-1.5 pt-2 border-t border-ink-100">
          {orderedDays.length === 0 ? (
            <p className="text-ink-400 italic text-center py-3">Sin días configurados</p>
          ) : (
            orderedDays.map((day: any, idx: number) => {
              const dayKcal = dayKcalSum(day);
              return (
                <details key={day.day_of_week} className="group bg-ink-50/60 rounded-md">
                  <summary className="cursor-pointer flex items-center justify-between px-2.5 py-2 font-semibold text-ink-800 select-none hover:bg-ink-100/60 rounded-md">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[10px] text-ink-500 uppercase tracking-wider w-7">
                        {DAYS_SHORT_PREVIEW[idx]}
                      </span>
                      <span className="capitalize text-ink-900">
                        {day.day_of_week}
                      </span>
                      <span className="text-ink-400 text-[10px]">
                        ({day.meals?.length ?? 0} comidas)
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-ink-500 text-[10px] tabular-nums">
                        {dayKcal > 0 ? `${dayKcal} kcal` : ''}
                      </span>
                      <span className="text-ink-400 group-open:rotate-90 transition-transform">▸</span>
                    </span>
                  </summary>
                  <ul className="px-2.5 pb-2 space-y-1.5">
                    {(day.meals ?? []).map((m: any, mIdx: number) => (
                      <li key={mIdx} className="bg-white rounded p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-semibold text-ink-700">
                              {MEAL_LABELS_PREVIEW[m.meal_type] ?? m.meal_type}
                              {m.scheduled_time && (
                                <span className="text-ink-400 ml-1">· {m.scheduled_time}</span>
                              )}
                            </p>
                            <p className="text-ink-900 font-medium mt-0.5">{m.name}</p>
                            {m.description && (
                              <p className="text-[10px] text-ink-500 mt-0.5">{m.description}</p>
                            )}
                          </div>
                          {m.calories != null && (
                            <span className="text-[10px] font-bold text-primary-700 bg-primary-50 rounded px-1.5 py-0.5 whitespace-nowrap tabular-nums">
                              {m.calories} kcal
                            </span>
                          )}
                        </div>
                        {(m.protein_g != null || m.carbs_g != null || m.fats_g != null) && (
                          <div className="flex gap-1.5 mt-1 text-[10px] text-ink-600">
                            {m.protein_g != null && <span className="bg-ink-100 rounded px-1.5 py-0.5">P {m.protein_g}g</span>}
                            {m.carbs_g != null && <span className="bg-ink-100 rounded px-1.5 py-0.5">C {m.carbs_g}g</span>}
                            {m.fats_g != null && <span className="bg-ink-100 rounded px-1.5 py-0.5">G {m.fats_g}g</span>}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}