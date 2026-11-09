import Link from 'next/link';
import type { ReactNode } from 'react';

interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Quantidade exibida como pill ao lado das ações. */
  count?: number;
  countLabel?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

/**
 * Cabeçalho padrão das telas administrativas.
 * Reaproveita a linguagem visual do catálogo público (eyebrow, título,
 * descrição e pill de contagem) sem alterar a casca de navegação do AdminShell.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  description,
  count,
  countLabel,
  backHref,
  backLabel = 'Voltar ao painel',
  actions,
}: AdminPageHeaderProps) {
  return (
    <header className="mb-6 border-b border-border pb-6 md:mb-8 md:pb-7">
      {backHref && (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-accent"
        >
          <span aria-hidden="true">←</span>
          {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              {eyebrow}
            </p>
          )}
          <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          {actions}
          {count !== undefined && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-semibold text-foreground">{count}</span>
              {countLabel ?? (count === 1 ? 'item' : 'itens')}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
