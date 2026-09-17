'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CartItem } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { toNumber, isInStock } from '@/lib/utils';

interface CartItemRowProps {
  item: CartItem;
  onChange: (quantity: number) => void;
  onRemove: () => void;
  updating: boolean;
}

const QUANTITY_MAX = 99;

export function CartItemRow({ item, onChange, onRemove, updating }: CartItemRowProps) {
  const stock = item.product ? item.product.stock : undefined;
  const max = Math.min(QUANTITY_MAX, stock ?? QUANTITY_MAX);
  const min = 1;
  const [value, setValue] = useState(String(item.quantity));

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

  return (
    <li className="flex items-center gap-4 py-5 first:pt-0 last:border-0 last:pb-0 border-b border-border">
      {/* Imagem */}
      <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
        <SafeImage
          src={item.imageUrl}
          alt={item.name ?? 'Produto'}
          fill
          className="object-cover"
          sizes="80px"
          priority={false}
        />
      </div>

      {/* Detalhes */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/loja/produtos/${item.product?.slug ?? ''}`}
          className="font-semibold text-foreground hover:text-accent transition-colors line-clamp-1"
        >
          {item.name ?? 'Produto'}
        </Link>
        {stockExceeded ? (
          <p className="mt-1 text-xs text-error">Quantidade acima do estoque disponível</p>
        ) : !isInStock(stock ?? 0) && stock !== undefined ? (
          <p className="mt-1 text-xs text-warning">Produto esgotado</p>
        ) : null}
        <p className="mt-1 text-sm text-muted-foreground">
          Unitário: <PriceFormatter price={item.price} showDiscount={false} />
        </p>
      </div>

      {/* Quantidade */}
      <div className="flex-shrink-0 flex items-center gap-2">
        <button
          type="button"
          aria-label="Reduzir"
          disabled={updating || stock === 0}
          onClick={() => step(-1)}
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          −
        </button>
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          onBlur={(e) => commit(Number(e.currentTarget.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(Number(e.currentTarget.value));
          }}
          disabled={updating || stock === 0}
          className="w-11 h-8 text-center text-sm font-semibold border border-border rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="button"
          aria-label="Aumentar"
          disabled={updating || stock === 0}
          onClick={() => step(1)}
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* Subtotal */}
      <div className="flex-shrink-0 w-32 text-right">
        <PriceFormatter price={toNumber(item.price) ? toNumber(item.price)! * item.quantity : null} />
      </div>

      {/* Remover */}
      <button
        type="button"
        aria-label="Remover"
        disabled={updating}
        onClick={onRemove}
        className="flex-shrink-0 p-2 rounded-lg text-error hover:bg-error/10 transition-colors disabled:opacity-50"
        title="Remover do carrinho"
      >
        ✕
      </button>
    </li>
  );
}
