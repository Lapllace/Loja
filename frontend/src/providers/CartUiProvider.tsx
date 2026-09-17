'use client';

// Estado de UI do carrinho (gaveta aberta/fechada).
//
// Fica separado do CartProvider para que o estado de dados do carrinho não seja
// remontado/recarregado quando apenas a gaveta abre — e para permitir que
// Header, CartDrawer e páginas compartilhem o mesmo controle de abertura.

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';

interface CartUiContextValue {
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartUiContext = createContext<CartUiContextValue | undefined>(undefined);

export function CartUiProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo(() => ({ isOpen, openCart, closeCart }), [isOpen, openCart, closeCart]);

  return <CartUiContext.Provider value={value}>{children}</CartUiContext.Provider>;
}

export function useCartUi(): CartUiContextValue {
  const context = useContext(CartUiContext);
  if (!context) {
    throw new Error('useCartUi deve ser usado dentro de <CartUiProvider>');
  }
  return context;
}
