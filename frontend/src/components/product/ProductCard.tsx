'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Product } from '@/lib/types';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { SafeImage } from '@/components/ui/SafeImage';
import { isInStock } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const mainImage = product.images?.[0];
  const inStock = isInStock(product.stock);
  const { addItem, updating } = useCart();
  const [added, setAdded] = useState(false);
  const isNew = product.featured;

  const handleQuickAdd = async () => {
    if (!inStock || updating) return;
    const result = await addItem(product.id);
    if (result.success) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={`/loja/produtos/${product.slug}`}
        className="block rounded-t-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {/* Imagem */}
        <div className="relative aspect-square bg-muted">
          <SafeImage
            src={mainImage?.url || null}
            alt={mainImage?.alt || product.name}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />

          {isNew && inStock && (
            <span className="absolute top-3 left-3 bg-accent text-primary-contrast text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded">
              Novo
            </span>
          )}

          {!inStock && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-semibold tracking-wide">Esgotado</span>
            </div>
          )}
        </div>

        <div className="p-4 pb-3">
          {product.category && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              {product.category.name}
            </p>
          )}

          <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
            {product.name}
          </h3>

          <div className="mt-3">
            <PriceFormatter price={product.price} comparePrice={product.comparePrice} />
          </div>

          {!inStock && (
            <p className="mt-2 text-sm text-error">Produto esgotado</p>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border px-4 py-3">
        <span className="text-xs text-muted-foreground">{inStock ? 'Disponível' : 'Sem estoque'}</span>
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!inStock || updating}
          className="rounded-lg bg-ink px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {added ? 'Adicionado' : updating ? 'Adicionando...' : 'Adicionar'}
        </button>
      </div>
    </article>
  );
}
