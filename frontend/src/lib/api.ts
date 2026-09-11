// Cliente de API para a vitrine pública.
// - Compatível com Server Components (Next.js) e Client Components.
// - Trata Decimal do Prisma (strings) conforme tipos em @/lib/types.
// - Nunca lança erro para o chamador em falhas previstas: retorna null/[]
//   para que as páginas renderizem estados de erro/vazio.
// - NÃO expõe dados administrativos (o backend já omite costPrice).

import {
  Brand,
  Category,
  Product,
  ProductFilters,
  ProductImage,
  ProductSort,
} from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/** Origem do backend (sem o sufixo /api), para resolver URLs relativas de imagens */
export const BACKEND_ORIGIN = (() => {
  try {
    const url = new URL(API_URL);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:3000';
  }
})();

const DEFAULT_TIMEOUT = 8000;
const DEFAULT_REVALIDATE = 60; // segundos

interface RequestOptions {
  next?: { revalidate?: number; tags?: string[] };
  signal?: AbortSignal;
}

/** Resolve URL de imagem: relativas apontam para o backend; externas são mantidas */
export function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${BACKEND_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

class ApiClient {
  private async request<T>(
    endpoint: string,
    opts: RequestOptions = {},
  ): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
    const url = `${API_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: opts.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT),
        next: opts.next ?? { revalidate: DEFAULT_REVALIDATE },
      });

      if (!response.ok) {
        return { ok: false, status: response.status };
      }

      return { ok: true, data: (await response.json()) as T };
    } catch {
      // API indisponível, timeout ou falha de rede
      return { ok: false, status: 0 };
    }
  }

  // ---------------- Products ----------------

  async getProducts(
    filters?: ProductFilters,
    sort?: ProductSort,
    opts: RequestOptions = {},
  ): Promise<Product[]> {
    const params = new URLSearchParams();

    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.brandId) params.append('brandId', filters.brandId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.minPrice !== undefined) params.append('minPrice', String(filters.minPrice));
    if (filters?.maxPrice !== undefined) params.append('maxPrice', String(filters.maxPrice));
    if (filters?.featured) params.append('featured', 'true');
    if (filters?.active) params.append('active', 'true');
    if (filters?.inStock) params.append('inStock', 'true');

    if (sort) {
      params.append('sortBy', sort.field);
      params.append('order', sort.order);
    }

    const qs = params.toString();
    const result = await this.request<Product[]>(`/products${qs ? `?${qs}` : ''}`, opts);
    return result.ok ? result.data : [];
  }

  async getProductBySlug(
    slug: string,
    opts: RequestOptions = {},
  ): Promise<Product | null> {
    const result = await this.request<Product>(`/products/slug/${encodeURIComponent(slug)}`, opts);
    if (result.ok) return result.data;
    if (result.status === 404) return null;
    throw new ApiUnavailableError();
  }

  async getProductById(
    id: string,
    opts: RequestOptions = {},
  ): Promise<Product | null> {
    const result = await this.request<Product>(`/products/${encodeURIComponent(id)}`, opts);
    if (result.ok) return result.data;
    if (result.status === 404) return null;
    throw new ApiUnavailableError();
  }

  // ---------------- Categories ----------------

  async getCategories(opts: RequestOptions = {}): Promise<Category[]> {
    const result = await this.request<Category[]>('/categories', opts);
    return result.ok ? result.data : [];
  }

  async getActiveCategories(opts: RequestOptions = {}): Promise<Category[]> {
    const categories = await this.getCategories(opts);
    return categories.filter((c) => c.active);
  }

  async getCategoryBySlug(
    slug: string,
    opts: RequestOptions = {},
  ): Promise<Category | null> {
    const result = await this.request<Category>(`/categories/slug/${encodeURIComponent(slug)}`, opts);
    if (result.ok) return result.data;
    if (result.status === 404) return null;
    throw new ApiUnavailableError();
  }

  // ---------------- Brands ----------------

  async getBrands(opts: RequestOptions = {}): Promise<Brand[]> {
    const result = await this.request<Brand[]>('/brands', opts);
    return result.ok ? result.data : [];
  }

  async getActiveBrands(opts: RequestOptions = {}): Promise<Brand[]> {
    const brands = await this.getBrands(opts);
    return brands.filter((b) => b.active);
  }

  // ---------------- Product Images ----------------

  async getProductImages(
    productId: string,
    opts: RequestOptions = {},
  ): Promise<ProductImage[]> {
    const result = await this.request<ProductImage[]>(
      `/products/${encodeURIComponent(productId)}/images`,
      opts,
    );
    return result.ok ? result.data : [];
  }
}

/** Erro lançado apenas quando a API está indisponível (rede/timeout/erro 5xx) */
export class ApiUnavailableError extends Error {
  constructor() {
    super('A API não está disponível no momento.');
    this.name = 'ApiUnavailableError';
  }
}

export const api = new ApiClient();
