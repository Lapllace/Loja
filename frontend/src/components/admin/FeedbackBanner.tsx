import type { ReactNode } from 'react';

export type FeedbackTone = 'success' | 'error' | 'warning' | 'info';

interface FeedbackBannerProps {
  tone?: FeedbackTone;
  children: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const TONE_STYLES: Record<FeedbackTone, string> = {
  success: 'border-success/30 bg-success/10 text-success',
  error: 'border-error/30 bg-error/10 text-error',
  warning: 'border-warning/40 bg-warning/10 text-foreground',
  info: 'border-accent/25 bg-accent-soft text-foreground',
};

const TONE_ROLE: Record<FeedbackTone, 'alert' | 'status'> = {
  success: 'status',
  error: 'alert',
  warning: 'alert',
  info: 'status',
};

/**
 * Mensagem inline de resultado de operação.
 * Substitui `alert()` mantendo o texto visível e acessível na página.
 */
export function FeedbackBanner({
  tone = 'info',
  children,
  onDismiss,
  className = '',
}: FeedbackBannerProps) {
  return (
    <div
      role={TONE_ROLE[tone]}
      className={`flex items-start justify-between gap-3 whitespace-pre-line rounded-xl border px-4 py-3 text-sm ${TONE_STYLES[tone]} ${className}`}
    >
      <div className="min-w-0">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar mensagem"
          className="shrink-0 rounded-md px-1 text-base leading-none opacity-70 transition-opacity hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  );
}
