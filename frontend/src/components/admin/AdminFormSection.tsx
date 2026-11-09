import type { ReactNode } from 'react';

interface AdminFormSectionProps {
  step?: number;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Bloco de formulário do admin (título, descrição e conteúdo).
 * Usado para organizar cadastro/edição de produto em seções previsíveis.
 */
export function AdminFormSection({
  step,
  title,
  description,
  aside,
  children,
  className = '',
}: AdminFormSectionProps) {
  return (
    <section className={`rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            {step !== undefined && (
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
                {step}
              </span>
            )}
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      {children}
    </section>
  );
}
