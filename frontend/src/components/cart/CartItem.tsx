'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CartItem } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { formatPrice, toNumber, isInStock } from '@/lib/utils';

interface CartItemRowProps {
  item: CartItem;
  onChange: (quantity: number) => void;
  onRemove: () => void;
  updating: boolean;
  /** Versão mais compacta usada na gaveta lateral. */
  compact?: boolean;
}

const QUANTITY_MAX = 99;

export function CartItemRow({
  item,
  onChange,
  onRemove,
  updating,
  compact = false,
}: CartItemRowProps) {
  const stock = item.product ? item.product.stock : undefined;
  const max = Math.min(QUANTITY_MAX, stock ?? QUANTITY_MAX);
  const min = 1;
  const [value, setValue] = useState(String(item.quantity));
  const [previousQuantity, setPreviousQuantity] = useState(item.quantity);
  const productName = item.name ?? item.product?.name ?? 'Produto';

  // Mantém o campo alinhado quando o carrinho é atualizado externamente
  // (ajuste durante a renderização, sem efeito).
  if (item.quantity !== previousQuantity) {
    setPreviousQuantity(item.quantity);
    setValue(String(item.quantity));
  }

  const commit = (next: number) => {
    const qty = Math.max(min, Math.min(Number.isFinite(max) ? max : QUANTITY_MAX, next));
    if (qty === item.quantity) return;
    setValue(String(qty));
    onChange(qty);
  };

  const step = (delta: number) => {
    const next = Math.max(min, (Number(value) || item.quantity) + delta);
    setValue(String(next));
    commit(next);
  };

  const stockExceeded = stock !== undefined && item.quantity > stock;
  const subtotal = toNumber(item.price) ? toNumber(item.price)! * item.quantity : null;

  return (
    <li className="border-b border-border py-5 first:pt-0 last:border-0 last:pb-0">
      <div className="flex gap-3 sm:gap-4">
        {/* Imagem */}
        <div
          className={`relative shrink-0 overflow-hidden rounded-xl bg-muted ${
            compact ? 'size-16' : 'size-20 sm:size-24'
          }`}
        >
          <SafeImage
            src={item.imageUrl}
            alt={productName}
            fill
            className="object-cover"
            sizes={compact ? '64px' : '96px'}
            priority={false}
          />
        </div>

        {/* Detalhes */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/loja/produtos/${item.product?.slug ?? ''}`}
                className="line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-accent"
              >
                {productName}
              </Link>

              {stockExceeded ? (
                <p className="mt-1 text-xs font-medium text-error">
                  Quantidade acima do estoque disponível
                </p>
              ) : !isInStock(stock ?? 0) && stock !== undefined ? (
                <p className="mt-1 text-xs font-medium text-warning">Produto esgotado</p>
              ) : null}

              <p className="mt-1 text-xs text-muted-foreground">
                Unitário: <span className="font-medium text-foreground">{formatPrice(item.price)}</span>
              </p>
            </div>

            <button
              type="button"
              aria-label={`Remover ${productName} do carrinho`}
              disabled={updating}
              onClick={onRemove}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-error/10 hover:text-error disabled:opacity-50 sm:size-8"
              title="Remover do carrinho"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 7.5h12M9.75 7.5V6a1.5 1.5 0 011.5-1.5h1.5A1.5 1.5 0 0114.25 6v1.5m-6 0l.6 11.1a1.5 1.5 0 001.5 1.4h4.3a1.5 1.5 0 001.5-1.4l.6-11.1M10.5 11.25v5.25m3-5.25v5.25" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5">
            {/* Quantidade */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Reduzir quantidade"
                disabled={updating || stock === 0 || item.quantity <= min}
                onClick={() => step(-1)}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-input text-sm font-semibold text-foreground transition-colors hover:border-accent/50 hover:bg-accent/10 disabled:opacity-40 sm:size-8"
              >
                −
              </button>
              <input
                type="number"
                min={min}
                max={max}
                value={value}
                aria-label={`Quantidade de ${productName}`}
                onChange={(event) => setValue(event.currentTarget.value)}
                onBlur={(event) => commit(Number(event.currentTarget.value))}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commit(Number(event.currentTarget.value));
                }}
                disabled={updating || stock === 0}
                className="h-10 w-12 rounded-lg border border-input bg-background text-center text-sm font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50 sm:h-8 sm:w-11"
              />
              <button
                type="button"
                aria-label="Aumentar quantidade"
                disabled={updating || stock === 0 || (Number.isFinite(max) && item.quantity >= max)}
                onClick={() => step(1)}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-input text-sm font-semibold text-foreground transition-colors hover:border-accent/50 hover:bg-accent/10 disabled:opacity-40 sm:size-8"
              >
                +
              </button>
            </div>

            {/* Subtotal */}
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Subtotal
              </p>
              <PriceFormatter price={subtotal} size="sm" showDiscount={false} className="justify-end" />
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
