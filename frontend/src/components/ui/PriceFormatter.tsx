import { formatPrice, calculateDiscountPercentage } from '@/lib/utils';

interface PriceFormatterProps {
  price: number | string | null | undefined;
  comparePrice?: number | string | null;
  className?: string;
  showDiscount?: boolean;
}

export function PriceFormatter({
  price,
  comparePrice,
  className = '',
  showDiscount = true,
}: PriceFormatterProps) {
  const discountPercentage = showDiscount
    ? calculateDiscountPercentage(comparePrice, price)
    : 0;
  const hasDiscount = discountPercentage > 0;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <span className="text-lg font-bold text-foreground">
        {formatPrice(price)}
      </span>

      {hasDiscount && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            {formatPrice(comparePrice)}
          </span>
          <span className="text-xs font-semibold text-warning bg-warning/10 px-2 py-1 rounded">
            -{discountPercentage}%
          </span>
        </>
      )}
    </div>
  );
}

