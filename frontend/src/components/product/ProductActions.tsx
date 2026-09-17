'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { isInStock } from '@/lib/utils';
import { useCart } from '@/providers/CartProvider';
import { useCartUi } from '@/providers/CartUiProvider';
import { useAuth } from '@/hooks/useAuth';

interface ProductActionsProps {
  productId: string;
  stock: number;
}

const QUANTITY_MAX = 99;

/**
 * Ações da página de produto: adicionar ao carrinho (integração real com
 * POST /cart/items) e compartilhar.
 */
export function ProductActions({ productId, stock }: ProductActionsProps) {
  const inStock = isInStock(stock);
  const { isAuthenticated } = useAuth();
  const { addItem, updating, getItemQuantity } = useCart();
  const { openCart } = useCartUi();

  const max = Math.min(QUANTITY_MAX, stock > 0 ? stock : 1);
  const [quantity, setQuantity] = useState(1);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const inCart = getItemQuantity(productId);
  const available = Math.max(0, stock - inCart);
  const canAdd = isAuthenticated && inStock && available > 0 && !updating;

  const handleAddToCart = async () => {
    setFeedback(null);
    const result = await addItem(productId, quantity);

    if (result.success) {
      setFeedback({ type: 'success', message: 'Produto adicionado ao carrinho!' });
      setQuantity(1);
      openCart();
      return;
    }

    setFeedback({ type: 'error', message: result.error ?? 'Não foi possível adicionar ao carrinho.' });
  };

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: document.title, url: window.location.href });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // usuário cancelou ou clipboard indisponível — ignorar silenciosamente
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      {inStock && (
        <div className="flex items-center gap-3">
          <label htmlFor="product-quantity" className="text-sm font-medium text-muted-foreground">
            Quantidade
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Reduzir quantidade"
              disabled={updating || quantity <= 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border-border font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              −
            </button>
            <input
              id="product-quantity"
              type="number"
              min={1}
              max={max}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              onBlur={(event) =>
                setQuantity(Math.max(1, Math.min(max, Number(event.target.value) || 1)))
              }
              disabled={updating}
              className="w-14 h-9 text-center text-sm font-semibold border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              type="button"
              aria-label="Aumentar quantidade"
              disabled={updating || quantity >= max}
              onClick={() => setQuantity((q) => Math.min(max, q + 1))}
              className="w-9 h-9 inline-flex items-center justify-center rounded-lg border-border font-semibold hover:bg-muted disabled:opacity-50 transition-colors"
            >
              +
            </button>
          </div>
          {available <= 0 && (
            <span className="text-xs text-warning ml-auto">Estoque máximo no carrinho</span>
          )}
        </div>
      )}

      {isAuthenticated ? (
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => void handleAddToCart()}
          disabled={!canAdd}
          title={
            !inStock
              ? 'Produto esgotado'
              : available <= 0
                ? 'Você já tem o estoque disponível no carrinho'
                : undefined
          }
        >
          {!inStock ? 'Produto esgotado' : updating ? 'Adicionando...' : 'Adicionar ao carrinho'}
        </Button>
      ) : (
        <Link
          href="/login"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors bg-accent text-ink hover:bg-accent-dark px-7 py-3 text-lg"
        >
          Entre para adicionar ao carrinho
        </Link>
      )}

      {inCart > 0 && (
        <p className="text-xs text-muted-foreground">
          Você já tem {inCart} {inCart === 1 ? 'unidade' : 'unidades'} deste produto no carrinho.
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={`text-sm font-medium ${feedback.type === 'success' ? 'text-success' : 'text-error'}`}
        >
          {feedback.message}
        </p>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
        Compartilhar
      </Button>
    </div>
  );
}
