// Cache local do carrinho (localStorage).
//
// Por que existe: o carrinho é server-side (GET /cart exige token), então em um
// reload o badge do header piscaria em 0 até a resposta chegar. Guardar o último
// carrinho conhecido dá hidratação instantânea; qualquer operação escrita
// sobrescreve o cache com a resposta do backend.
//
// ATENÇÃO: nada aqui é fonte de verdade — preço e estoque vêm SEMPRE do backend.
// O cache é descartado no logout, em respostas 401 e ao trocar de usuário.

import { Cart } from './types';

const CART_STORAGE_KEY = 'cart_cache';

interface CachedCart {
  userId?: string;
  cart: Cart;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function readCartStorage(): Cart | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const cache = parsed as Partial<CachedCart>;
    const cart = cache.cart;
    if (!cart || typeof cart !== 'object' || !Array.isArray(cart.items)) return null;
    return cart;
  } catch {
    return null;
  }
}

export function writeCartStorage(cart: Cart): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ cart }));
  } catch {
    // storage cheio/indisponível — o cache é apenas otimização, ignorar.
  }
}

export function clearCartStorage(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // ignorar
  }
}
