'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { CartList } from '@/components/cart/CartList';
import { CartSummary } from '@/components/cart/CartSummary';
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

  if (authLoading || (loading && !initialized)) {
    return <LoadingState message="Carregando seu carrinho..." className="min-h-[400px]" />;
  }

  return (
    <div className="container-custom py-8 md:py-12">
      <nav aria-label="Você está aqui" className="mb-4 text-sm text-muted-foreground">
        <Link href="/loja" className="hover:text-accent transition-colors">
          Início
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-foreground font-medium">Meu carrinho</span>
      </nav>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Meu carrinho</h1>

      {mutationError && (
        <div
          role="alert"
          className="mb-6 rounded-lg border-error/30 bg-error/10 px-4 py-3 text-sm text-error flex items-start justify-between gap-3"
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CartList
            items={items}
            loading={loading}
            error={error}
            updating={updating}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            isAuthenticated={isAuthenticated}
            onLoginPrompt={handleRetry}
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
    </div>
  );
}
