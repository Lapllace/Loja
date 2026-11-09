'use client';

import React, { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { ProductFilters as ProductFiltersType, ProductSort } from '@/lib/types';
import { Button } from '@/components/ui/Button';

interface ProductFiltersProps {
  onFiltersChange: (filters: ProductFiltersType) => void;
  onSortChange: (sort: ProductSort) => void;
  currentFilters: ProductFiltersType;
  currentSort: ProductSort;
  /** A ordenação pode ser exibida na barra de ferramentas em vez do painel. */
  showSort?: boolean;
  /** Permite que a página limpe também filtros vindos da URL. */
  onClearFilters?: () => void;
  className?: string;
}

export function ProductFilters({
  onFiltersChange,
  onSortChange,
  currentFilters,
  currentSort,
  showSort = true,
  onClearFilters,
  className = '',
}: ProductFiltersProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const [priceRange, setPriceRange] = useState({
    min: currentFilters.minPrice?.toString() ?? '',
    max: currentFilters.maxPrice?.toString() ?? '',
  });

  // Mantém os campos sincronizados quando a página limpa os filtros.
  // Ajuste durante a renderização em vez de sincronizar via efeito.
  const priceSyncKey = `${currentFilters.minPrice ?? ''}|${currentFilters.maxPrice ?? ''}`;
  const [syncedPriceKey, setSyncedPriceKey] = useState(priceSyncKey);

  if (priceSyncKey !== syncedPriceKey) {
    setSyncedPriceKey(priceSyncKey);
    setPriceRange({
      min: currentFilters.minPrice?.toString() ?? '',
      max: currentFilters.maxPrice?.toString() ?? '',
    });
  }

  const handleCategoryChange = (categoryId?: string) => {
    onFiltersChange({
      ...currentFilters,
      categoryId,
    });
  };

  const handlePriceChange = () => {
    const min = priceRange.min ? parseFloat(priceRange.min) : undefined;
    const max = priceRange.max ? parseFloat(priceRange.max) : undefined;
    onFiltersChange({
      ...currentFilters,
      minPrice: Number.isFinite(min as number) ? min : undefined,
      maxPrice: Number.isFinite(max as number) ? max : undefined,
    });
  };

  const clearFilters = () => {
    if (onClearFilters) {
      onClearFilters();
      return;
    }

    setPriceRange({ min: '', max: '' });
    onFiltersChange({ search: currentFilters.search });
    onSortChange({ field: 'name', order: 'asc' });
  };

  const sortValue = `${currentSort.field}-${currentSort.order}`;

  return (
    <div className={`space-y-6 ${className}`}>
      {showSort && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ordenar por
          </h3>
          <label htmlFor="filters-sort" className="sr-only">
            Ordenar produtos
          </label>
          <select
            id="filters-sort"
            value={sortValue}
            onChange={(event) => {
              const [field, order] = event.target.value.split('-') as [
                ProductSort['field'],
                ProductSort['order'],
              ];
              onSortChange({ field, order });
            }}
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="name-asc">Nome (A–Z)</option>
            <option value="name-desc">Nome (Z–A)</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="createdAt-desc">Mais recentes</option>
            <option value="createdAt-asc">Mais antigos</option>
          </select>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Categorias
        </h3>

        <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => handleCategoryChange(undefined)}
            aria-pressed={!currentFilters.categoryId}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              !currentFilters.categoryId
                ? 'bg-accent-soft font-semibold text-accent'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            Todas as categorias
          </button>

          {categoriesLoading &&
            [...Array(4)].map((_, index) => (
              <div key={`category-skeleton-${index}`} className="h-9 animate-pulse rounded-lg bg-muted" />
            ))}

          {!categoriesLoading &&
            categories.map((category) => {
              const active = currentFilters.categoryId === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategoryChange(active ? undefined : category.id)}
                  aria-pressed={active}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'bg-accent-soft font-semibold text-accent'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Faixa de preço
        </h3>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handlePriceChange();
          }}
        >
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Mín"
                aria-label="Preço mínimo"
                value={priceRange.min}
                onChange={(event) => setPriceRange({ ...priceRange, min: event.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-2 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <span className="shrink-0 text-xs text-muted-foreground" aria-hidden="true">
              até
            </span>
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                R$
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="Máx"
                aria-label="Preço máximo"
                value={priceRange.max}
                onChange={(event) => setPriceRange({ ...priceRange, max: event.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-2 text-sm text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </div>

          <Button type="submit" variant="outline" size="sm" className="mt-3 w-full">
            Aplicar faixa
          </Button>
        </form>
      </section>

      <section className="border-t border-border pt-6">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3.5 py-3 transition-colors hover:bg-muted/60">
          <input
            type="checkbox"
            checked={Boolean(currentFilters.inStock)}
            onChange={(event) =>
              onFiltersChange({ ...currentFilters, inStock: event.target.checked })
            }
            className="mt-0.5 size-4 rounded border-input accent-[var(--accent)]"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Apenas em estoque</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Mostrar somente produtos disponíveis para envio.
            </span>
          </span>
        </label>
      </section>

      <Button onClick={clearFilters} variant="ghost" size="sm" className="w-full">
        Limpar filtros
      </Button>
    </div>
  );
}
