'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProducts } from '@/hooks/useProducts';
import { ProductFilters, ProductSort } from '@/lib/types';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductFilters as ProductFiltersComponent } from '@/components/filters/ProductFilters';
import { Button } from '@/components/ui/Button';

function ProductsContent() {
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

  const { products, loading, error } = useProducts(effectiveFilters, sort);

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setClientFilters(newFilters);
  };

  const handleSortChange = (newSort: ProductSort) => {
    setSort(newSort);
  };
  const hasQueryFilters = Boolean(categoryId || search || featured);

  return (
    <div className="py-8 md:py-10">
      <div className="container-custom">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {featured ? 'Produtos em destaque' : search ? `Busca: "${search}"` : 'Produtos'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? 'Carregando produtos...'
              : `${products.length} produto(s) encontrado(s)`}
          </p>
          <div className="sm:hidden mt-4">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar de filtros */}
          <aside className={`lg:w-64 shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="lg:sticky lg:top-32 bg-white border border-border rounded-xl p-5">
              <ProductFiltersComponent
                onFiltersChange={handleFiltersChange}
                onSortChange={handleSortChange}
                currentFilters={effectiveFilters}
                currentSort={sort}
              />
            </div>
          </aside>

          {/* Grade de produtos */}
          <div className="flex-1 min-w-0">
            <ProductGrid
              products={products}
              loading={loading}
              error={error}
              emptyTitle="Nenhum produto encontrado"
              emptyDescription={
                hasQueryFilters
                  ? 'Tente ajustar os filtros ou buscar por outro termo.'
                  : 'Ainda não temos produtos cadastrados. Volte em breve!'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-8">
          <div className="container-custom">
            <div className="animate-pulse">
              <div className="h-8 w-56 bg-muted rounded mb-3" />
              <div className="h-4 w-40 bg-muted rounded" />
            </div>
          </div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
