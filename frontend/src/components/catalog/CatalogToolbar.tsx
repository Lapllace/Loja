'use client';

import React from 'react';
import { ProductSort } from '@/lib/types';

interface CatalogToolbarProps {
  resultCount: number;
  loading?: boolean;
  sort: ProductSort;
  onSortChange: (sort: ProductSort) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onClearFilters?: () => void;
}

const SORT_OPTIONS: Array<{ value: string; label: string; sort: ProductSort }> = [
  { value: 'name-asc', label: 'Nome (A–Z)', sort: { field: 'name', order: 'asc' } },
  { value: 'name-desc', label: 'Nome (Z–A)', sort: { field: 'name', order: 'desc' } },
  { value: 'price-asc', label: 'Menor preço', sort: { field: 'price', order: 'asc' } },
  { value: 'price-desc', label: 'Maior preço', sort: { field: 'price', order: 'desc' } },
  { value: 'createdAt-desc', label: 'Mais recentes', sort: { field: 'createdAt', order: 'desc' } },
  { value: 'createdAt-asc', label: 'Mais antigos', sort: { field: 'createdAt', order: 'asc' } },
];

function FilterIcon() {
  return (
    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M3 5.25h18M6 12h12m-9 6.75h6"
      />
    </svg>
  );
}

export function CatalogToolbar({
  resultCount,
  loading = false,
  sort,
  onSortChange,
  activeFilterCount,
  onOpenFilters,
  onClearFilters,
}: CatalogToolbarProps) {
  const currentValue =
    SORT_OPTIONS.find(
      (option) => option.sort.field === sort.field && option.sort.order === sort.order,
    )?.value ?? 'name-asc';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span>
          {loading ? (
            'Carregando produtos...'
          ) : (
            <>
              <span className="font-semibold text-foreground">{resultCount}</span>{' '}
              {resultCount === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </>
          )}
        </span>

        {activeFilterCount > 0 && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs font-semibold text-accent transition-colors hover:text-accent-dark hover:underline"
          >
            Limpar filtros ({activeFilterCount})
          </button>
        )}
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-input bg-background px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
        >
          <FilterIcon />
          Filtros
          {activeFilterCount > 0 && (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
          <label
            htmlFor="catalog-sort"
            className="hidden whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block"
          >
            Ordenar
          </label>
          <select
            id="catalog-sort"
            value={currentValue}
            onChange={(event) => {
              const option = SORT_OPTIONS.find((item) => item.value === event.target.value);
              if (option) onSortChange(option.sort);
            }}
            className="h-10 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:w-auto"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
