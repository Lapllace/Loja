'use client';

import React, { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { ProductFilters, ProductSort } from '@/lib/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters as ProductFiltersComponent } from '@/components/filters/ProductFilters';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';
import { CatalogToolbar } from '@/components/catalog/CatalogToolbar';
import { FilterDrawer } from '@/components/catalog/FilterDrawer';
import { Button } from '@/components/ui/Button';

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Filtros derivados da URL (searchParams é a fonte da verdade)
  const categoryId = searchParams.get('categoryId') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const featured = searchParams.get('featured') === 'true';
  const minPrice = searchParams.get('minPrice');
  const maxPrice = searchParams.get('maxPrice');

  const urlFilters = useMemo<ProductFilters>(() => {
    const f: ProductFilters = { active: true };
    if (categoryId) f.categoryId = categoryId;
    if (search) f.search = search;
    if (featured) f.featured = true;
    if (minPrice) f.minPrice = parseFloat(minPrice);
    if (maxPrice) f.maxPrice = parseFloat(maxPrice);
    return f;
  }, [categoryId, search, featured, minPrice, maxPrice]);

  const [sort, setSort] = useState<ProductSort>({ field: 'name', order: 'asc' });
  const [clientFilters, setClientFilters] = useState<ProductFilters | null>(null);

  // Filtros do cliente (categoria/ordenação/preço) mesclados com os da URL.
  // A busca da URL é sempre preservada.
  const effectiveFilters = useMemo<ProductFilters>(
    () => ({
      ...urlFilters,
      ...(clientFilters ?? {}),
      search: clientFilters?.search ?? urlFilters.search,
    }),
    [urlFilters, clientFilters],
  );

  const { products, loading, error, reload } = useProducts(effectiveFilters, sort);

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setClientFilters(newFilters);
  };

  const handleSortChange = (newSort: ProductSort) => {
    setSort(newSort);
  };

  const closeFilters = useCallback(() => setShowFilters(false), []);

  const clearAllFilters = useCallback(() => {
    setClientFilters({ search: urlFilters.search });
    setSort({ field: 'name', order: 'asc' });

    if (categoryId || featured || minPrice || maxPrice) {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const queryString = params.toString();
      router.replace(`/loja/produtos${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      });
    }
  }, [urlFilters.search, categoryId, featured, minPrice, maxPrice, search, router]);

  const activeFilterCount = [
    effectiveFilters.categoryId,
    effectiveFilters.minPrice !== undefined,
    effectiveFilters.maxPrice !== undefined,
    effectiveFilters.inStock,
  ].filter(Boolean).length;

  const hasQueryFilters = Boolean(categoryId || search || featured);
  const title = featured
    ? 'Produtos em destaque'
    : search
      ? `Busca por “${search}”`
      : 'Catálogo';
  const description = search
    ? 'Confira os produtos encontrados para o termo pesquisado.'
    : featured
      ? 'Seleção de produtos marcados como destaque pela loja.'
      : 'Explore todos os produtos disponíveis, com filtros por categoria, preço e disponibilidade.';

  const emptyAction =
    hasQueryFilters || activeFilterCount > 0 ? (
      <Button onClick={clearAllFilters} variant="outline" size="sm">
        Limpar filtros
      </Button>
    ) : (
      <Link
        href="/loja"
        className="text-sm font-semibold text-accent transition-colors hover:text-accent-dark hover:underline"
      >
        Voltar para a home
      </Link>
    );

  return (
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom">
        <CatalogHeader
          breadcrumbs={[
            { label: 'Início', href: '/loja' },
            { label: 'Produtos' },
          ]}
          eyebrow="Loja"
          title={title}
          description={description}
          count={loading ? undefined : products.length}
          actions={
            search ? (
              <Link
                href="/loja/produtos"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-accent/40 hover:text-accent"
              >
                Limpar busca
                <span aria-hidden="true">✕</span>
              </Link>
            ) : undefined
          }
        />

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          {/* Filtros no desktop */}
          <aside className="hidden shrink-0 lg:block lg:w-72">
            <div className="sticky top-32 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-foreground">Filtros</h2>
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
                    {activeFilterCount} {activeFilterCount === 1 ? 'ativo' : 'ativos'}
                  </span>
                )}
              </div>

              <ProductFiltersComponent
                onFiltersChange={handleFiltersChange}
                onSortChange={handleSortChange}
                currentFilters={effectiveFilters}
                currentSort={sort}
                showSort={false}
                onClearFilters={clearAllFilters}
              />
            </div>
          </aside>

          {/* Resultados */}
          <div className="min-w-0 flex-1">
            <CatalogToolbar
              resultCount={products.length}
              loading={loading}
              sort={sort}
              onSortChange={handleSortChange}
              activeFilterCount={activeFilterCount}
              onOpenFilters={() => setShowFilters(true)}
              onClearFilters={clearAllFilters}
            />

            <div className="mt-6">
              <ProductGrid
                products={products}
                loading={loading}
                error={error}
                onRetry={reload}
                emptyTitle="Nenhum produto encontrado"
                emptyDescription={
                  hasQueryFilters || activeFilterCount > 0
                    ? 'Tente ajustar os filtros ou buscar por outro termo.'
                    : 'Ainda não temos produtos cadastrados. Volte em breve!'
                }
                action={emptyAction}
              />
            </div>
          </div>
        </div>
      </div>

      <FilterDrawer open={showFilters} onClose={closeFilters}>
        <ProductFiltersComponent
          onFiltersChange={handleFiltersChange}
          onSortChange={handleSortChange}
          currentFilters={effectiveFilters}
          currentSort={sort}
          showSort={false}
          onClearFilters={() => {
            clearAllFilters();
            closeFilters();
          }}
        />
      </FilterDrawer>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="pb-16 pt-6 md:pt-8">
          <div className="container-custom">
            <div className="animate-pulse border-b border-border pb-8">
              <div className="mb-5 h-4 w-44 rounded bg-muted" />
              <div className="h-10 w-64 rounded bg-muted" />
              <div className="mt-3 h-4 w-full max-w-md rounded bg-muted" />
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <div className="hidden h-96 w-72 shrink-0 rounded-2xl bg-muted lg:block" />
              <div className="min-w-0 flex-1">
                <div className="h-16 rounded-2xl bg-muted" />
                <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4">
                  {[...Array(8)].map((_, index) => (
                    <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
