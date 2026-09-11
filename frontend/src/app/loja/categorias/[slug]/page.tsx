import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';

// Página de categoria (Server Component)
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  try {
    return await api.getCategoryBySlug(slug, { next: { revalidate: 300, tags: ['categories'] } });
  } catch {
    return 'unavailable' as const;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category || category === 'unavailable') {
    return { title: 'Categoria não encontrada' };
  }

  const description =
    category.description ??
    `Explore produtos da categoria ${category.name}.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/loja/categorias/${category.slug}` },
    openGraph: {
      title: category.name,
      description,
      type: 'website',
      ...(category.imageUrl ? { images: [{ url: category.imageUrl }] } : {}),
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (category === 'unavailable') {
    return (
      <div className="py-12">
        <div className="container-custom">
          <EmptyState
            title="Não foi possível carregar a categoria"
            description="A API não está disponível no momento. Tente novamente em alguns instantes."
            action={
              <Link href="/loja/produtos" className="text-accent hover:underline text-sm font-medium">
                Ver todos os produtos
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  if (!category) {
    notFound();
  }

  // Busca apenas produtos ATIVOS da categoria (sem expor dados internos)
  const products = await api.getProducts(
    { categoryId: category.id, active: true },
    { field: 'name', order: 'asc' },
    { next: { revalidate: 60, tags: ['products'] } },
  );

  return (
    <div className="py-8 md:py-10">
      <div className="container-custom">
        {/* Breadcrumb */}
        <nav aria-label="Navegação estrutural" className="mb-6 text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link href="/loja" className="hover:text-accent">Início</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/loja/produtos" className="hover:text-accent">Produtos</Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground font-medium">
              {category.name}
            </li>
          </ol>
        </nav>

        {/* Header da categoria */}
        <header className="mb-8 pb-6 border-b border-border">
          <h1 className="text-3xl font-bold text-foreground">{category.name}</h1>
          {category.description && (
            <p className="text-muted-foreground mt-2 max-w-2xl leading-relaxed">
              {category.description}
            </p>
          )}
        </header>

        {/* Produtos */}
        <ProductGrid
          products={products}
          emptyTitle="Nenhum produto nesta categoria"
          emptyDescription="Esta categoria ainda não possui produtos disponíveis. Explore outras categorias!"
          action={
            <Link href="/loja/produtos" className="text-accent hover:underline text-sm font-medium">
              Ver todos os produtos
            </Link>
          }
        />
      </div>
    </div>
  );
}
