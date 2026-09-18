// Cliente de API para a vitrine pública.
// - Compatível com Server Components (Next.js) e Client Components.
// - Trata Decimal do Prisma (strings) conforme tipos em @/lib/types.
// - Nunca lança erro para o chamador em falhas previstas: retorna null/[]
//   para que as páginas renderizem estados de erro/vazio.
// - NÃO expõe dados administrativos (o backend já omite costPrice).

import {
  Brand,
  Cart,
  CartItem,
  Category,
  Product,
  ProductFilters,
  ProductImage,
  ProductSort,
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  CartMutationResult,
  Address,
  CreateAddressPayload,
  Order,
  Payment,
  ProductFormPayload,
  UploadedImage,
} from './types';
import { SESSION_STORAGE_KEY } from './constants';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Resolve a base da API para uso no browser.
 *
 * Em desenvolvimento acessado por outro dispositivo da rede local (ex.:
 * http://192.168.0.10:3001), `localhost` apontaria para o próprio celular e a
 * requisição falharia. Quando NEXT_PUBLIC_API_URL não está definida, derivamos
 * a URL do host atual da janela, mantendo porta e sufixo originais da API_URL
 * (que é o padrão localhost:3000/api).
 */
export function resolveApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window === 'undefined') return API_URL;

  try {
    const base = new URL(API_URL);
    base.hostname = window.location.hostname;
    return base.toString().replace(/\/$/, '');
  } catch {
    return API_URL;
  }
}

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

interface TimeoutSignal {
  signal: AbortSignal;
  /** Cancela o temporizador; deve ser chamado quando a requisição termina. */
  clear: () => void;
}

function createTimeoutSignal(timeoutMs: number): TimeoutSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

interface RequestOptions {
  next?: { revalidate?: number; tags?: string[] };
  signal?: AbortSignal;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  // FormData é usado no upload multipart: nunca definir Content-Type manualmente,
  // o browser precisa gerar o boundary automaticamente.
  body?: string | FormData;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number };

export class ApiHttpError extends Error {
  constructor(public readonly status: number) {
    super(`API request failed with status ${status}`);
    this.name = 'ApiHttpError';
  }
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
  ): Promise<ApiResult<T>> {
    const url = `${resolveApiUrl()}${endpoint}`;
    const timeout = opts.signal ? null : createTimeoutSignal(DEFAULT_TIMEOUT);

    try {
      const isFormData = opts.body instanceof FormData;

      const response = await fetch(url, {
        method: opts.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(isFormData ? {} : opts.headers),
        },
        body: opts.body,
        signal: opts.signal ?? timeout!.signal,
        // Only use next option for server-side requests
        ...(opts.next && { next: opts.next }),
      });

      if (!response.ok) {
        return { ok: false, status: response.status };
      }

      return { ok: true, data: (await response.json()) as T };
    } catch {
      // API indisponível, timeout ou falha de rede
      return { ok: false, status: 0 };
    } finally {
      timeout?.clear();
    }
  }

  /**
   * Resolve o accessToken da sessão.
   *
   * Prioridade: token explícito → sessão em memória (authManager, via workspace
   * `@/lib/auth`, que importa este módulo) → chave 'auth_session' do localStorage.
   * As duas últimas leem a MESMA chave e a leitura direta garante que o cliente
   * funcione mesmo antes de a sessão ser hidratada em memória.
   */
  private resolveToken(token?: string): string | null {
    if (token) return token;
    if (typeof window === 'undefined') return null;

    return readStoredAccessToken();
  }

  /** ---------------- Products ---------------- */

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

  // ---------------- Authentication ----------------

  async login(
    credentials: LoginCredentials,
    opts: RequestOptions = {},
  ): Promise<AuthResponse | null> {
    const result = await this.request<AuthResponse>('/auth/login', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return result.ok ? result.data : null;
  }

  async register(
    data: RegisterData,
    opts: RequestOptions = {},
  ): Promise<AuthResponse | null> {
    const result = await this.request<AuthResponse>('/auth/register', {
      ...opts,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return result.ok ? result.data : null;
  }

    async getMe(token: string, opts: RequestOptions = {}): Promise<User | null> {
    const result = await this.request<User>('/auth/me', {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    if (!result.ok) {
      throw new ApiHttpError(result.status);
    }
    return result.data;
  }

  // ---------------- Cart (authenticated) -------------
  //
  // Contrato do backend (ver backend/src/modules/carts/carts.controller.ts):
  //  - Todas as rotas exigem `Authorization: Bearer <accessToken>`.
  //  - O usuário é resolvido pelo token (nunca enviamos userId/cartId).
  //  - `price` e `product` são proibidos no corpo (o backend valida o preço).
  //    POST/PATCH enviam SOMENTE { productId, quantity } / { quantity }.
  //
  // Mutações retornam CartMutationResult em vez de engolir o erro, para que a
  // UI consiga distinguir 400 (estoque), 401 (sessão) e 404 (item removido).

  /** GET /cart — carrinho atual do usuário autenticado. */
  async getCart(token?: string): Promise<CartMutationResult> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401, message: 'Sessão não encontrada.' };

    const result = await this.request<unknown>('/cart', {
      headers: { Authorization: `Bearer ${resolved}` },
      next: { revalidate: 0 },
    });

    if (!result.ok) return { ok: false, status: result.status };

    const cart = normalizeCart(result.data);
    return cart
      ? { ok: true, cart }
      : { ok: false, status: 0, message: 'Resposta inválida do servidor.' };
  }

  /** POST /cart/items — body: { productId, quantity } (nada além disso). */
  async addToCart(
    productId: string,
    quantity: number,
    token?: string,
  ): Promise<CartMutationResult> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401, message: 'Sessão não encontrada.' };

    const result = await this.request<unknown>('/cart/items', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId, quantity }),
    });

    if (!result.ok) return { ok: false, status: result.status };

    // O backend devolve o CartItem; recarregamos para obter o carrinho completo.
    const inline = normalizeCart(result.data);
    return inline ? { ok: true, cart: inline } : this.getCart(resolved);
  }

  /** PATCH /cart/items/:productId — body: { quantity }. */
  async updateCartItem(
    productId: string,
    quantity: number,
    token?: string,
  ): Promise<CartMutationResult> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401, message: 'Sessão não encontrada.' };

    const result = await this.request<unknown>(
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${resolved}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      },
    );

    if (!result.ok) return { ok: false, status: result.status };

    const inline = normalizeCart(result.data);
    return inline ? { ok: true, cart: inline } : this.getCart(resolved);
  }

  /** DELETE /cart/items/:productId — remove um item pelo id do produto. */
  async removeCartItem(productId: string, token?: string): Promise<CartMutationResult> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401, message: 'Sessão não encontrada.' };

    const result = await this.request<unknown>(
      `/cart/items/${encodeURIComponent(productId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${resolved}` },
      },
    );

    if (!result.ok) return { ok: false, status: result.status };

    return this.getCart(resolved);
  }

  /** DELETE /cart — esvazia o carrinho por completo. */
  async clearCart(token?: string): Promise<CartMutationResult> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401, message: 'Sessão não encontrada.' };

    const result = await this.request<unknown>('/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${resolved}` },
    });

    if (!result.ok) return { ok: false, status: result.status };

    const inline = normalizeCart(result.data);
    return inline ? { ok: true, cart: inline } : this.getCart(resolved);
  }

  async getAddresses(token?: string): Promise<ApiResult<Address[]>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Address[]>('/addresses', {
      headers: { Authorization: `Bearer ${resolved}` },
    });
  }

  async createAddress(
    payload: CreateAddressPayload,
    token?: string,
  ): Promise<ApiResult<Address>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Address>('/addresses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  }

  async deleteAddress(id: string, token?: string): Promise<ApiResult<null>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<null>(`/addresses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${resolved}` },
    });
  }

  async createOrder(
    addressId: string,
    notes?: string,
    token?: string,
  ): Promise<ApiResult<Order>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Order>('/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ addressId, ...(notes ? { notes } : {}) }),
    });
  }

  async createPayment(
    orderId: string,
    method: Payment['method'],
    token?: string,
  ): Promise<ApiResult<Payment>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Payment>('/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId, method }),
    });
  }

  /** ---------------- Admin: products ---------------- */

  /**
   * Envia um produto ao backend. Quando há imagem, usa multipart/form-data
   * (campo `image`); caso contrário envia JSON puro.
   */
  private async submitProduct(
    endpoint: string,
    method: 'POST' | 'PATCH',
    payload: ProductFormPayload,
    token?: string,
  ): Promise<ApiResult<Product>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    const { image, ...fields } = payload;

    if (!image) {
      return this.request<Product>(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${resolved}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fields),
      });
    }

    const form = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) form.append(key, String(value));
    }
    form.append('image', image, image.name || 'product-image.jpg');

    return this.request<Product>(endpoint, {
      method,
      headers: { Authorization: `Bearer ${resolved}` },
      body: form,
    });
  }

  async createProduct(
    payload: ProductFormPayload,
    token?: string,
  ): Promise<ApiResult<Product>> {
    return this.submitProduct('/products', 'POST', payload, token);
  }

  async updateProduct(
    id: string,
    payload: ProductFormPayload,
    token?: string,
  ): Promise<ApiResult<Product>> {
    return this.submitProduct(
      `/products/${encodeURIComponent(id)}`,
      'PATCH',
      payload,
      token,
    );
  }

  /**
   * Envia uma URL de imagem remota ao backend, que baixa o arquivo e devolve
   * a rota estática local (ex.: /uploads/123-abc.jpg).
   */
  async uploadImageFromUrl(
    imageUrl: string,
    token?: string,
  ): Promise<ApiResult<UploadedImage>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<UploadedImage>('/products/upload-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resolved}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ imageUrl }),
    });
  }

  async getOrders(token?: string): Promise<ApiResult<Order[]>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Order[]>('/orders', {
      headers: { Authorization: `Bearer ${resolved}` },
    });
  }

  async getOrderById(
    orderId: string,
    token?: string,
  ): Promise<ApiResult<Order>> {
    const resolved = this.resolveToken(token);
    if (!resolved) return { ok: false, status: 401 };

    return this.request<Order>(`/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${resolved}` },
    });
  }
}

/**
 * Lê o accessToken de 'auth_session' no localStorage.
 * Não depende de módulos com estado (authManager) para evitar ciclos de import
 * e para funcionar durante o primeiro paint do client.
 */
export function readStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    if (!isRecordLike(parsed)) return null;
    const token = parsed.token ?? parsed.accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/** Normaliza a resposta do backend (ou payload não tipado) em Cart. */
function isRecordLike(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

const isRecord = isRecordLike;

function toItem(raw: Record<string, unknown>): CartItem {
  const product = isRecord(raw.product) ? (raw.product as Record<string, unknown>) : null;
  const imagesRaw: unknown[] = isRecord(product) && Array.isArray(product.images)
    ? (product.images as unknown[])
    : [];
  const firstImg = imagesRaw.length > 0 && isRecord(imagesRaw[0]) ? imagesRaw[0] : null;
  const price = product?.price;
  const name: unknown = product?.name ?? raw.name;
  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    productId: String(raw.productId ?? product?.id ?? ''),
    quantity: Math.max(0, Number(raw.quantity ?? 0)),
    price: price as number | string | undefined,
    name: typeof name === 'string' ? name : typeof name === 'number' ? String(name) : undefined,
    imageUrl: firstImg && typeof firstImg.url === 'string' ? firstImg.url : null,
    product: product ? (product as unknown as Product) : undefined,
  };
}

/** Normaliza qualquer payload do /cart (GET, POST, PATCH, DELETE) para Cart. */
function normalizeCart(raw: unknown): Cart | null {
  const obj = isRecord(raw) ? raw : null;
  if (!obj) return null;
  const itemsRaw: unknown[] | null = Array.isArray(obj.items)
    ? (obj.items as unknown[])
    : isRecord(obj.cart) && Array.isArray((obj.cart as Record<string, unknown>).items)
      ? ((obj.cart as Record<string, unknown>).items as unknown[])
      : null;
  if (!itemsRaw) return null;
  const items = itemsRaw.filter(isRecord).map((i): CartItem => toItem(i)).filter((i) => i.quantity > 0 && i.productId);
  const totalItems = items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);
  const totalAmount = items.reduce((sum: number, i: CartItem) => {
    const unitPrice = typeof i.price === 'number' ? i.price : Number(i.price ?? 0);
    return sum + (Number.isFinite(unitPrice) ? unitPrice : 0) * i.quantity;
  }, 0);
  return {
    id: typeof obj.id === 'string' ? obj.id : undefined,
    items,
    totalItems,
    totalAmount,
  };
}

/** Erro lançado apenas quando a API está indisponível (rede/timeout/erro 5xx) */
export class ApiUnavailableError extends Error {
  constructor() {
    super('A API não está disponível no momento.');
    this.name = 'ApiUnavailableError';
  }
}

export const api = new ApiClient();
