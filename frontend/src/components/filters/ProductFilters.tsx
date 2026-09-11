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
}

export function ProductFilters({
  onFiltersChange,
  onSortChange,
  currentFilters,
  currentSort,
}: ProductFiltersProps) {
  const { categories } = useCategories();
  const [priceRange, setPriceRange] = useState({
    min: currentFilters.minPrice?.toString() ?? '',
    max: currentFilters.maxPrice?.toString() ?? '',
  });

  const handleCategoryChange = (categoryId: string) => {
    onFiltersChange({
      ...currentFilters,
      categoryId: currentFilters.categoryId === categoryId ? undefined : categoryId,
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

  const handleSortChange = (field: ProductSort['field']) => {
    const newOrder = currentSort.field === field && currentSort.order === 'asc' ? 'desc' : 'asc';
    onSortChange({ field, order: newOrder });
  };

  const clearFilters = () => {
    setPriceRange({ min: '', max: '' });
    onFiltersChange({
      search: currentFilters.search,
    });
    onSortChange({ field: 'name', order: 'asc' });
  };

  return (
    <div className="space-y-6">
      {/* Ordenação */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
          Ordenar por
        </h3>
        <div className="space-y-1.5">
          {[
            { field: 'name' as const, label: 'Nome' },
            { field: 'price' as const, label: 'Preço' },
            { field: 'createdAt' as const, label: 'Mais recentes' },
          ].map((option) => (
            <button
              key={option.field}
              onClick={() => handleSortChange(option.field)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                currentSort.field === option.field
                  ? 'bg-ink text-accent font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className="flex items-center justify-between">
                <span>{option.label}</span>
                {currentSort.field === option.field && (
                  <span aria-hidden="true">{currentSort.order === 'asc' ? '↑' : '↓'}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Categorias */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
          Categorias
        </h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryChange(category.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                currentFilters.categoryId === category.id
                  ? 'bg-ink text-accent font-medium'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Faixa de preço */}
      <div>
        <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">
          Faixa de preço (R$)
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            placeholder="Mín"
            aria-label="Preço mínimo"
            value={priceRange.min}
            onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <span className="text-muted-foreground">–</span>
          <input
            type="number"
            min="0"
            placeholder="Máx"
            aria-label="Preço máximo"
            value={priceRange.max}
            onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        <Button onClick={handlePriceChange} variant="outline" size="sm" className="w-full mt-2">
          Aplicar
        </Button>
      </div>

      {/* Estoque */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
          <input
            type="checkbox"
            checked={currentFilters.inStock}
            onChange={(e) => onFiltersChange({ ...currentFilters, inStock: e.target.checked })}
            className="w-4 h-4 accent-[#C9A227] border-border rounded"
          />
          Apenas em estoque
        </label>
      </div>

      {/* Limpar */}
      <Button onClick={clearFilters} variant="ghost" size="sm" className="w-full">
        Limpar filtros
      </Button>
    </div>
  );
}
