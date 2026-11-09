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
  // Visitantes também podem adicionar: o item vai para o carrinho local
  // (localStorage) e só o checkout exige conta.
  const canAdd = inStock && available > 0 && !updating;

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
    <div className="mt-7 space-y-4 border-t border-border pt-6">
      {inStock ? (
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
          <div>
            <label
              htmlFor="product-quantity"
              className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              Quantidade
            </label>

            <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-input bg-card">
              <button
                type="button"
                aria-label="Reduzir quantidade"
                disabled={updating || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="inline-flex h-full w-11 items-center justify-center text-lg font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
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
                className="h-full w-14 border-x border-input bg-transparent text-center text-sm font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40"
              />
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={updating || quantity >= max}
                onClick={() => setQuantity((q) => Math.min(max, q + 1))}
                className="inline-flex h-full w-11 items-center justify-center text-lg font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-40"
              >
                +
              </button>
            </div>

            {available <= 0 && (
              <p className="mt-2 text-xs font-medium text-warning">
                Estoque máximo já está no carrinho.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:pt-[26px]">
            <Button
              variant="primary"
              size="lg"
              className="h-12 w-full"
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
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.014 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                />
              </svg>
              {updating ? 'Adicionando...' : 'Adicionar ao carrinho'}
            </Button>

            <Button variant="outline" size="md" className="h-11 w-full" onClick={handleShare}>
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.7}
                  d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
                />
              </svg>
              Compartilhar
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button variant="secondary" size="lg" className="h-12 w-full" disabled>
            Produto esgotado
          </Button>
          <Button variant="outline" size="md" className="h-11 w-full" onClick={handleShare}>
            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.7}
                d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"
              />
            </svg>
            Compartilhar
          </Button>
        </div>
      )}

      {!isAuthenticated && (
        <p className="text-xs leading-relaxed text-muted-foreground">
          Você está comprando como visitante.{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Entre na conta
          </Link>{' '}
          para finalizar a compra.
        </p>
      )}

      {inCart > 0 && (
        <p className="text-xs text-muted-foreground">
          Você já tem {inCart} {inCart === 1 ? 'unidade' : 'unidades'} deste produto no carrinho.
        </p>
      )}

      {feedback && (
        <p
          role="status"
          className={`flex items-center gap-2 text-sm font-medium ${
            feedback.type === 'success' ? 'text-success' : 'text-error'
          }`}
        >
          {feedback.type === 'success' ? (
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : (
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m0 3.75h.008v.008H12v-.008z" />
            </svg>
          )}
          {feedback.message}
        </p>
      )}
    </div>
  );
}
