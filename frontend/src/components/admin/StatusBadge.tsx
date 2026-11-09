import type { ReactNode } from 'react';

export type StatusTone = 'success' | 'muted' | 'warning' | 'error' | 'accent';

interface StatusBadgeProps {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}

const TONE_STYLES: Record<StatusTone, string> = {
  success: 'bg-success/10 text-success',
  muted: 'bg-muted text-muted-foreground',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
  accent: 'bg-accent-soft text-accent',
};

/**
 * Pill de situação reutilizada em produtos, categorias e marcas.
 * Cores vêm dos tokens globais (globals.css) — sem paleta paralela.
 */
export function StatusBadge({ tone = 'muted', children, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_STYLES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
