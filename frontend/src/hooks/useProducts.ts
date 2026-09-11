'use client';

import { useEffect, useState } from 'react';
import { Product, ProductFilters, ProductSort } from '@/lib/types';
import { api } from '@/lib/api';

/**
 * Hook de listagem de produtos (client-side, para filtros interativos).
 * Server Components devem usar api.getProducts diretamente.
 */
export function useProducts(filters?: ProductFilters, sort?: ProductSort) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serializa filtros para estável (evita refetch em cada render)
  const filterKey = JSON.stringify(filters ?? {});
  const sortKey = JSON.stringify(sort ?? {});

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      try {
        if (!cancelled) setLoading(true);
        if (!cancelled) setError(null);
        const parsedFilters = JSON.parse(filterKey) as ProductFilters;
        const parsedSort = JSON.parse(sortKey) as ProductSort;
        const data = await api.getProducts(parsedFilters, parsedSort, { next: { revalidate: 0 } });
        if (!cancelled) setProducts(data);
      } catch {
        if (!cancelled) {
          setError('A API não está disponível no momento. Tente novamente em instantes.');
          setProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [filterKey, sortKey]);

  return { products, loading, error };
}

/**
 * Busca produto por slug (client-side).
 * Server Components devem usar api.getProductBySlug diretamente.
 */
export function useProduct(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getProductBySlug(slug, { next: { revalidate: 0 } });
        if (!cancelled) setProduct(data);
      } catch {
        if (!cancelled) {
          setError('A API não está disponível no momento.');
          setProduct(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}

