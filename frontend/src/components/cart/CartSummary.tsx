'use client';

import Link from 'next/link';
import { Cart } from '@/lib/types';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { toNumber } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface CartSummaryProps {
  cart: Cart | null;
  onClear: () => void;
  onCheckout: () => void;
  clearing: boolean;
  isAuthenticated: boolean;
  /** Versão enxuta para a gaveta (sem card, sem frete/imposto) */
  compact?: boolean;
}

export function CartSummary({
  cart,
  onClear,
  onCheckout,
  clearing,
  isAuthenticated,
  compact = false,
}: CartSummaryProps) {
  const itemsCount = cart?.totalItems ?? 0;
  const subtotal = toNumber(cart?.totalAmount) ?? 0;

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemsCount} {itemsCount === 1 ? 'item' : 'itens'})
          </span>
          <PriceFormatter price={subtotal} size="sm" className="justify-end" />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <span className="text-sm font-semibold text-foreground">Total</span>
          <PriceFormatter price={subtotal} size="lg" tone="accent" className="justify-end" />
        </div>

        <div className="mt-4 space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onCheckout}
            disabled={!isAuthenticated || itemsCount === 0}
            title={
              !isAuthenticated
                ? 'Faça login para finalizar'
                : itemsCount === 0
                  ? 'Adicione produtos ao carrinho'
                  : undefined
            }
          >
            Finalizar compra
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-error hover:bg-error/10"
            onClick={onClear}
            disabled={clearing || itemsCount === 0}
          >
            {clearing ? 'Limpando...' : 'Limpar carrinho'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <aside className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-32">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-lg font-bold text-foreground">Resumo do pedido</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {itemsCount} {itemsCount === 1 ? 'item' : 'itens'} no carrinho
        </p>
      </div>

      <div className="px-5 py-5">
        <dl className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium text-foreground">
              <PriceFormatter price={subtotal} size="sm" className="justify-end" />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Frete</dt>
            <dd className="text-right font-medium text-muted-foreground">
              Calculado no checkout
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <dt className="font-semibold text-foreground">Total parcial</dt>
            <dd className="text-right">
              <PriceFormatter price={subtotal} size="lg" tone="accent" className="justify-end" />
            </dd>
          </div>
        </dl>

        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          O frete é calculado na próxima etapa, de acordo com o endereço informado.
        </p>

        <div className="mt-5 space-y-2.5">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onCheckout}
            disabled={!isAuthenticated || itemsCount === 0}
            title={
              !isAuthenticated
                ? 'Faça login para finalizar'
                : itemsCount === 0
                  ? 'Adicione produtos ao carrinho'
                  : undefined
            }
          >
            Finalizar compra
          </Button>

          {!isAuthenticated && (
            <p className="text-center text-xs text-muted-foreground">
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Entre na conta
              </Link>{' '}
              para finalizar a compra.
            </p>
          )}

          <Button
            variant="outline"
            size="md"
            className="w-full border-error/60 text-error hover:border-error hover:bg-error hover:text-white"
            onClick={onClear}
            disabled={clearing || itemsCount === 0}
          >
            {clearing ? 'Limpando...' : 'Limpar carrinho'}
          </Button>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Pague com segurança. Estoque verificado em tempo real.
        </p>
      </div>
    </aside>
  );
}
