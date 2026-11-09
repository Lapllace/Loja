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
  const isFeatured = product.featured;

  const handleQuickAdd = async () => {
    if (!inStock || updating) return;
    const result = await addItem(product.id);
    if (result.success) {
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    }
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-xl hover:shadow-ink/5">
      <Link
        href={`/loja/produtos/${product.slug}`}
        className="block rounded-t-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {/* Imagem */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <SafeImage
            src={mainImage?.url || null}
            alt={mainImage?.alt || product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />

          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            {isFeatured && inStock ? (
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white shadow-sm">
                Destaque
              </span>
            ) : (
              <span aria-hidden="true" />
            )}

            {!inStock && (
              <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm">
                Esgotado
              </span>
            )}
          </div>

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/25">
              <span className="rounded-full bg-card/95 px-4 py-2 text-sm font-semibold text-foreground shadow-sm">
                Produto esgotado
              </span>
            </div>
          )}
        </div>

        <div className="p-3 pb-2.5 sm:p-4 sm:pb-3">
          {product.category && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              {product.category.name}
            </p>
          )}

          <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-accent sm:text-[15px]">
            {product.name}
          </h3>

          <div className="mt-3">
            <PriceFormatter price={product.price} comparePrice={product.comparePrice} />
          </div>

          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`size-1.5 rounded-full ${inStock ? 'bg-success' : 'bg-error'}`}
              aria-hidden="true"
            />
            {inStock ? 'Disponível para envio' : 'Sem estoque'}
          </div>
        </div>
      </Link>

      <div className="mt-auto px-3 pb-3 sm:px-4 sm:pb-4">
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!inStock || updating}
          aria-label={
            inStock
              ? `Adicionar ${product.name} ao carrinho`
              : `${product.name} está esgotado`
          }
          className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:gap-2 sm:px-4 sm:text-xs ${
            added
              ? 'bg-success text-white'
              : 'bg-ink text-white hover:bg-accent'
          }`}
        >
          {added ? (
            <>
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Adicionado
            </>
          ) : (
            <>
              <svg className="hidden size-4 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.014 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>
              <span className="sm:hidden">{updating ? 'Adicionando' : 'Adicionar'}</span>
              <span className="hidden sm:inline">
                {updating ? 'Adicionando...' : 'Adicionar ao carrinho'}
              </span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}
