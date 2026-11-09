import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';

interface PriceFormatterProps {
  price: number | string | null | undefined;
  comparePrice?: number | string | null;
  className?: string;
  showDiscount?: boolean;
  /** Escala do preço principal; mantém `md` como padrão dos cards. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Cor do preço principal (destaque em totais). */
  tone?: 'default' | 'accent';
}

const PRICE_SIZE = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
  xl: 'text-3xl md:text-4xl',
} as const;

const PRICE_TONE = {
  default: 'text-foreground',
  accent: 'text-accent',
} as const;

export function PriceFormatter({
  price,
  comparePrice,
  className = '',
  showDiscount = true,
  size = 'md',
  tone = 'default',
}: PriceFormatterProps) {
  const discountPercentage = showDiscount
    ? calculateDiscountPercentage(comparePrice, price)
    : 0;
  const hasDiscount = discountPercentage > 0;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className={`${PRICE_SIZE[size]} font-bold tracking-tight ${PRICE_TONE[tone]}`}>
        {formatPrice(price)}
      </span>

      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(comparePrice)}
          </span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            -{discountPercentage}%
          </span>
        </>
      )}
    </div>
  );
}
