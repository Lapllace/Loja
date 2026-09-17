'use client';

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

  // Frete e imposto são placeholders (checkout/pagamento fora de escopo)
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Subtotal ({itemsCount} {itemsCount === 1 ? 'item' : 'itens'})
          </span>
          <span className="font-semibold text-foreground"><PriceFormatter price={subtotal} /></span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-bold text-accent"><PriceFormatter price={total} /></span>
        </div>

        <div className="mt-4 space-y-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onCheckout}
            disabled={!isAuthenticated || itemsCount === 0}
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
    <aside className="bg-muted/60 rounded-xl p-6 sticky top-6">
      <h2 className="text-lg font-bold text-foreground mb-5">Resumo do pedido</h2>

      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Subtotal ({itemsCount} {itemsCount === 1 ? 'item' : 'itens'})</dt>
          <dd className="font-medium text-foreground"><PriceFormatter price={subtotal} /></dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Frete</dt>
          <dd className="font-medium"><PriceFormatter price={shipping} /></dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Imposto</dt>
          <dd className="font-medium"><PriceFormatter price={tax} /></dd>
        </div>
        <div className="border-t border-border pt-3 mt-3">
          <dt className="text-sm text-muted-foreground">Total</dt>
          <dd className="text-xl font-bold text-accent"><PriceFormatter price={total} /></dd>
        </div>
      </dl>

      <div className="mt-6 space-y-3">
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
          variant="outline"
          size="md"
          className="w-full border-error text-error hover:bg-error hover:text-white"
          onClick={onClear}
          disabled={clearing || itemsCount === 0}
        >
          {clearing ? 'Limpando...' : 'Limpar carrinho'}
        </Button>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground text-center">
        Pague com segurança. Estoque verificado em tempo real.
      </p>
    </aside>
  );
}
