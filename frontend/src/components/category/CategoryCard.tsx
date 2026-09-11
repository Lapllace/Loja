import Link from 'next/link';
import { Category } from '@/lib/types';
import { SafeImage } from '@/components/ui/SafeImage';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      href={`/loja/categorias/${category.slug}`}
      className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg"
    >
      <div className="relative rounded-lg overflow-hidden border border-border group-hover:shadow-md transition-shadow duration-200">
        {/* Imagem */}
        <div className="relative aspect-square bg-muted">
          <SafeImage
            src={category.imageUrl}
            alt={category.name}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Conteúdo */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-white font-semibold text-base leading-tight">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-white/75 text-xs line-clamp-2 mt-1">
                {category.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
