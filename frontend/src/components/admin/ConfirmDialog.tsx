'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Diálogo de confirmação acessível compartilhado pelas telas administrativas.
 * O backend continua sendo a autoridade: erros (ex.: 409) são exibidos aqui.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  error,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  const confirmStyles =
    tone === 'danger'
      ? 'bg-error text-white hover:bg-error/90'
      : 'bg-accent text-white hover:bg-accent-dark';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]"
      />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h2 id="confirm-dialog-title" className="text-lg font-bold text-foreground">
          {title}
        </h2>

        <div className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</div>

        {error && (
          <div className="mt-4 whitespace-pre-line rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${confirmStyles}`}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
