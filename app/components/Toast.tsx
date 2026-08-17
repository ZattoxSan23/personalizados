'use client';

import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

let listeners: Array<(toast: Toast) => void> = [];

export function toast(type: ToastType, message: string) {
  const t: Toast = { id: Date.now() + Math.random(), type, message };
  listeners.forEach((cb) => cb(t));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const onToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, 3500);
  }, []);

  useEffect(() => {
    listeners.push(onToast);
    return () => {
      listeners = listeners.filter((cb) => cb !== onToast);
    };
  }, [onToast]);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-sm z-[100] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.type === 'success'
            ? 'bg-primary-700 text-white'
            : t.type === 'info'
            ? 'bg-ink-900 text-white'
            : 'bg-red-600 text-white';
        const Icon = t.type === 'success' ? CheckCircle2 : t.type === 'info' ? Info : XCircle;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-lg px-4 py-3 shadow-popover animate-slide-up ${styles}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}