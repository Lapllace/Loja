'use client';

// Gaveta lateral do carrinho (Tailwind CSS 4).
//
// Usa o estado global (useCart) para carregar/alterar/remover/esvaziar itens.
// Nenhum dado de preço é enviado ao backend: apenas productId e quantity.
//
// Acessibilidade: role="dialog" + aria-modal na gaveta, Esc para fechar,
// clique no overlay fecha e o scroll do body é travado enquanto aberta.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/providers/CartProvider';
import { useCartUi } from '@/providers/CartUiProvider';
import { useAuth } from '@/hooks/useAuth';
import { CartItemRow } from './CartItem';
import { CartSummary } from './CartSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { CartItem } from '@/lib/types';

function CartIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.013 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

export function CartDrawer() {
  const router = useRouter();
  const { isOpen, closeCart } = useCartUi();
  const { isAuthenticated } = useAuth();
  const {
    cart,
    loading,
    updating,
    error,
    mutationError,
    initialized,
    updateItem,
    removeItem,
    clearCart,
    refresh,
    clearError,
  } = useCart();

  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const [clearing, setClearing] = useState(false);

  const items = cart?.items ?? [];

  // Fecha a gaveta ao navegar (ex.: clicar em um produto).
  useEffect(() => {
    closeCart();
    clearError();
  }, [pathname, closeCart, clearError]);

  // Bloqueia o scroll do body e trata Esc enquanto aberta.
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', handleKeyDown);

    // Foco inicial no painel para leitores de tela.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeCart]);

  const handleUpdate = (item: CartItem, quantity: number) => {
    void updateItem(item.productId, quantity);
  };

  const handleRemove = (item: CartItem) => {
    void removeItem(item.productId);
  };

  const handleClear = async () => {
    if (!window.confirm('Remover todos os itens do carrinho?')) return;
    setClearing(true);
    try {
      await clearCart();
    } finally {
      setClearing(false);
    }
  };

  const handleCheckout = () => {
    closeCart();
    router.push('/checkout');
  };

  return (
    <div
      className={`fixed inset-0 z-[100] ${isOpen ? '' : 'pointer-events-none'}`}
      aria-hidden={!isOpen}
      inert={!isOpen}
    >
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'
          }`}
        onClick={closeCart}
      />

      {/* Painel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Carrinho de compras"
        tabIndex={-1}
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl flex flex-col transition-transform duration-300 ease-out focus:outline-none ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Cabeçalho */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            Meu carrinho
            {items.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {cart?.totalItems} {cart?.totalItems === 1 ? 'item' : 'itens'}
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Fechar carrinho"
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Erro de mutação (ex.: estoque) */}
        {mutationError && (
          <div
            role="alert"
            className="mx-5 mt-4 rounded-lg border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error flex items-start justify-between gap-3"
          >
            <span>{mutationError}</span>
            <button
              type="button"
              onClick={clearError}
              aria-label="Descartar aviso"
              className="shrink-0 font-semibold hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {/* Conteúdo — visitantes também veem os itens adicionados */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && items.length === 0 ? (
            <EmptyState
              title="Não foi possível carregar"
              description={error}
              icon={<CartIcon />}
              action={
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-2 inline-flex items-center rounded-xl bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Tentar novamente
                </button>
              }
            />
          ) : (loading || !initialized) && items.length === 0 ? (
            <LoadingState message="Carregando seu carrinho..." className="min-h-[240px]" />
          ) : items.length === 0 ? (
            <EmptyState
              title="Seu carrinho está vazio"
              description="Navegue pela loja e adicione os produtos que deseja."
              icon={<CartIcon />}
              action={
                <Link
                  href="/loja/produtos"
                  onClick={closeCart}
                  className="mt-2 inline-flex items-center rounded-xl bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Explorar produtos
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {items.map((item) => (
                <CartItemRow
                  key={item.id ?? item.productId}
                  item={item}
                  updating={updating}
                  onChange={(quantity) => handleUpdate(item, quantity)}
                  onRemove={() => handleRemove(item)}
                  compact
                />
              ))}
            </ul>
          )}
        </div>

        {/* Rodapé com resumo — visitantes também veem lista e total */}
        {items.length > 0 && (
          <footer className="border-t border-border bg-muted/30 p-5">
            <CartSummary
              cart={cart}
              onClear={() => void handleClear()}
              onCheckout={handleCheckout}
              clearing={clearing || updating}
              isAuthenticated={isAuthenticated}
              compact
            />
            {!isAuthenticated && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Comprando como visitante — os itens ficam salvos neste dispositivo.{' '}
                <Link
                  href="/login"
                  onClick={closeCart}
                  className="font-semibold text-accent hover:underline"
                >
                  Entre para finalizar
                </Link>
              </p>
            )}
            <Link
              href="/loja/carrinho"
              onClick={closeCart}
              className="mt-3 block text-center text-sm font-semibold text-accent hover:underline"
            >
              Ver página completa do carrinho
            </Link>
          </footer>
        )}
      </div>
    </div>
  );
}
