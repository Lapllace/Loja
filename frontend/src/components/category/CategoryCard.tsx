import Link from 'next/link';
import { Category } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const hasImage = Boolean(category.imageUrl);

  return (
    <Link
      href={`/loja/categorias/${category.slug}`}
      className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-border/80 bg-ink shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-ink/10">
        {hasImage ? (
          <>
            <SafeImage
              src={category.imageUrl}
              alt={category.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#0a1f44_0%,#123a7a_55%,#1d4ed8_100%)]" />
            <div
              className="absolute -right-6 -top-6 size-24 rounded-full border border-white/15"
              aria-hidden="true"
            />
            <div
              className="absolute -bottom-8 -left-4 size-20 rounded-full bg-accent-bright/20 blur-2xl"
              aria-hidden="true"
            />
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="text-sm font-semibold leading-tight text-white sm:text-base">
            {category.name}
          </h3>
          <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors group-hover:text-white sm:text-[11px]">
            Explorar
            <svg className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
