import React from 'react';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';

interface CatalogHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string | null;
  /** Quantidade de produtos; omitida enquanto carrega. */
  count?: number;
  countLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

/**
 * Cabeçalho compartilhado pelo catálogo e pelas páginas de categoria.
 * Mantém a mesma hierarquia visual da home (eyebrow, título e contagem).
 */
export function CatalogHeader({
  title,
  eyebrow,
  description,
  count,
  countLabel,
  breadcrumbs,
  actions,
}: CatalogHeaderProps) {
  return (
    <header className="mb-7 border-b border-border pb-7 md:mb-9 md:pb-8">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-5" />
      )}

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
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
            <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
              {description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
          {count !== undefined && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
              <span className="font-semibold text-foreground">{count}</span>
              {countLabel ?? (count === 1 ? 'produto' : 'produtos')}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
