// Constantes compartilhadas entre o cliente de API, o AuthManager e os hooks.
// Mantidas em módulo próprio (sem imports) para evitar ciclos:
// api.ts ↔ auth.ts.

/** Chave do localStorage onde a sessão autenticada é persistida. */
export const SESSION_STORAGE_KEY = 'auth_session';

/** Rota da API de carrinho (prefixada por API_URL). */
export const CART_ENDPOINTS = {
  cart: '/cart',
  items: '/cart/items',
  item: (productId: string) => `/cart/items/${encodeURIComponent(productId)}`,
} as const;

/** Limite de unidades por item aceito pela UI (o estoque do produto manda). */
export const CART_MAX_QUANTITY = 99;
