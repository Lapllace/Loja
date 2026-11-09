'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { CartList } from '@/components/cart/CartList';
import { CartSummary } from '@/components/cart/CartSummary';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { LoadingState } from '@/components/ui/LoadingState';
import { CartItem } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const {
    cart,
    loading,
    updating,
    error,
    mutationError,
    updateItem,
    removeItem,
    clearCart,
    initialized,
    refresh,
    clearError,
  } = useCart();

  const [clearing, setClearing] = useState(false);
  const items = cart?.items ?? [];
  const itemsCount = cart?.totalItems ?? 0;

  const handleUpdate = async (item: CartItem, quantity: number) => {
    await updateItem(item.productId, quantity);
  };

  const handleRemove = async (item: CartItem) => {
    await removeItem(item.productId);
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
    router.push('/checkout');
  };

  const handleRetry = () => {
    clearError();
    void refresh();
  };

  // `!initialized` cobre a primeira hidratação (GET /cart ou carrinho de
  // visitante): sem isso o visitante veria "carrinho vazio" antes dos itens.
  if (authLoading || !initialized) {
    return (
      <div className="pb-16 pt-6 md:pt-8">
        <div className="container-custom">
          <Breadcrumbs
            className="mb-6"
            items={[{ label: 'Início', href: '/loja' }, { label: 'Meu carrinho' }]}
          />
          <LoadingState message="Carregando seu carrinho..." className="min-h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom">
        <Breadcrumbs
          className="mb-6"
          items={[{ label: 'Início', href: '/loja' }, { label: 'Meu carrinho' }]}
        />

        <header className="mb-7 flex flex-col gap-4 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Sacola
            </p>
            <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">
              Meu carrinho
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {itemsCount === 0
                ? 'Nenhum item adicionado por enquanto.'
                : `${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'} no carrinho.`}
            </p>
          </div>

          <Link
            href="/loja/produtos"
            className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-accent/40 hover:text-accent sm:self-auto"
          >
            <span aria-hidden="true">←</span>
            Continuar comprando
          </Link>
        </header>

        {mutationError && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error"
          >
            <span>{mutationError}</span>
            <button
              type="button"
              onClick={clearError}
              aria-label="Descartar aviso"
              className="shrink-0 font-semibold transition-opacity hover:opacity-70"
            >
              ✕
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <CartList
              items={items}
              loading={loading}
              error={error}
              updating={updating}
              onUpdate={handleUpdate}
              onRemove={handleRemove}
              isAuthenticated={isAuthenticated}
              onRetry={handleRetry}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
              <CartList
                items={items}
                loading={loading}
                error={error}
                updating={updating}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                isAuthenticated={isAuthenticated}
                onRetry={handleRetry}
              />
            </div>

            <div>
              <CartSummary
                cart={cart}
                onClear={handleClear}
                onCheckout={handleCheckout}
                clearing={clearing || updating}
                isAuthenticated={isAuthenticated}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
