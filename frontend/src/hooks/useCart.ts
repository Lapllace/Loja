'use client';

// Reexporta o hook do carrinho para que os componentes importem de @/hooks.
// A implementação (e o Provider) vive em @/providers/CartProvider.

export { useCart, CartProvider } from '@/providers/CartProvider';
export type { CartOperationResult } from '@/providers/CartProvider';
