import Link from 'next/link';
import { Product } from '@/lib/types';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { SafeImage } from '@/components/ui/SafeImage';
import { isInStock } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const mainImage = product.images?.[0];
  const inStock = isInStock(product.stock);

  return (
    <Link
      href={`/loja/produtos/${product.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
    >
      <article className="h-full bg-white rounded-lg border border-border overflow-hidden transition-shadow duration-200 hover:shadow-md">
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

          {product.featured && inStock && (
            <span className="absolute top-3 left-3 bg-accent text-primary-contrast text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded">
              Destaque
            </span>
          )}

          {!inStock && (
            <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
              <span className="text-white font-semibold tracking-wide">Esgotado</span>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-4">
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
      </article>
    </Link>
  );
}
