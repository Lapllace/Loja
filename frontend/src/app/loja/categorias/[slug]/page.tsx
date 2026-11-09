import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { ProductGrid } from '@/components/product/ProductGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { CatalogHeader } from '@/components/catalog/CatalogHeader';

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
      <div className="pb-16 pt-6 md:pt-8">
        <div className="container-custom">
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState
              title="Não foi possível carregar a categoria"
              description="A API não está disponível no momento. Tente novamente em alguns instantes."
              action={
                <Link
                  href="/loja/produtos"
                  className="text-sm font-semibold text-accent transition-colors hover:text-accent-dark hover:underline"
                >
                  Ver todos os produtos
                </Link>
              }
            />
          </div>
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
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom">
        <CatalogHeader
          breadcrumbs={[
            { label: 'Início', href: '/loja' },
            { label: 'Produtos', href: '/loja/produtos' },
            { label: category.name },
          ]}
          eyebrow="Categoria"
          title={category.name}
          description={
            category.description ??
            'Confira os produtos disponíveis nesta categoria.'
          }
          count={products.length}
          actions={
            <Link
              href="/loja/produtos"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:border-accent/40 hover:text-accent"
            >
              <span aria-hidden="true">←</span>
              Ver catálogo completo
            </Link>
          }
        />

        <ProductGrid
          products={products}
          emptyTitle="Nenhum produto nesta categoria"
          emptyDescription="Esta categoria ainda não possui produtos disponíveis. Explore o catálogo completo ou outras categorias."
          action={
            <Link
              href="/loja/produtos"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark"
            >
              Explorar catálogo
            </Link>
          }
        />
      </div>
    </div>
  );
}
