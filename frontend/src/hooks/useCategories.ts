'use client';

import { useState, useEffect } from 'react';
import { Category } from '@/lib/types';
import { api } from '@/lib/api';

/**
 * Categorias ativas (client-side, para filtros interativos).
 * Server Components devem usar api.getActiveCategories diretamente.
 */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getActiveCategories({ next: { revalidate: 0 } });
        if (!cancelled) setCategories(data);
      } catch {
        if (!cancelled) {
          setError('A API não está disponível no momento.');
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories, loading, error };
}

/**
 * Busca categoria por slug (client-side).
 * Server Components devem usar api.getCategoryBySlug diretamente.
 */
export function useCategory(slug: string) {
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCategory() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getCategoryBySlug(slug, { next: { revalidate: 0 } });
        if (!cancelled) setCategory(data);
      } catch {
        if (!cancelled) {
          setError('A API não está disponível no momento.');
          setCategory(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (slug) {
      fetchCategory();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { category, loading, error };
}

