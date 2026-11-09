import Link from 'next/link';
import type { ReactNode } from 'react';

export type AdminStatTone = 'default' | 'accent' | 'success' | 'warning' | 'error';

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: AdminStatTone;
  icon?: ReactNode;
  href?: string;
}

const TONE_STYLES: Record<AdminStatTone, { value: string; chip: string }> = {
  default: { value: 'text-foreground', chip: 'bg-muted text-muted-foreground' },
  accent: { value: 'text-accent', chip: 'bg-accent-soft text-accent' },
  success: { value: 'text-success', chip: 'bg-success/10 text-success' },
  warning: { value: 'text-warning', chip: 'bg-warning/10 text-warning' },
  error: { value: 'text-error', chip: 'bg-error/10 text-error' },
};

/**
 * Indicador compacto usado no topo das telas administrativas.
 * Não busca dados: recebe valores já calculados pela página.
 */
export function AdminStatCard({
  label,
  value,
  hint,
  tone = 'default',
  icon,
  href,
}: AdminStatCardProps) {
  const styles = TONE_STYLES[tone];

  const content = (
    <div className="flex h-full items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        <p className={`mt-1.5 text-2xl font-bold leading-none ${styles.value}`}>{value}</p>
        {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {icon && (
        <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${styles.chip}`}>
          {icon}
        </span>
      )}
    </div>
  );

  const className =
    'block rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors md:p-5';

  if (href) {
    return (
      <Link href={href} className={`${className} hover:border-accent/40`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function AdminStatGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
