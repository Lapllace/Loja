import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, resolveImageUrl } from '@/lib/api';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductActions } from '@/components/product/ProductActions';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatPrice, isInStock } from '@/lib/utils';

// Página de produto (Server Component) - revalida a cada 60s
export const revalidate = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getProduct(slug: string) {
  try {
    return await api.getProductBySlug(slug, { next: { revalidate: 60, tags: ['products'] } });
  } catch {
    // API indisponível: renderiza estado de erro (sem 404)
    return 'unavailable' as const;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product || product === 'unavailable') {
    return { title: 'Produto não encontrado' };
  }

  const description =
    product.shortDescription ??
    product.description?.slice(0, 160) ??
    `${product.name} - ${formatPrice(product.price)}`;

  const ogImage = resolveImageUrl(product.images?.[0]?.url);

  return {
    title: product.name,
    description,
    alternates: { canonical: `/loja/produtos/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (product === 'unavailable') {
    return (
      <div className="py-12">
        <div className="container-custom">
          <EmptyState
            title="Não foi possível carregar o produto"
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

  if (!product) {
    notFound();
  }

  const inStock = isInStock(product.stock);

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
            {product.category && (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <Link
                    href={`/loja/categorias/${product.category.slug}`}
                    className="hover:text-accent"
                  >
                    {product.category.name}
                  </Link>
                </li>
              </>
            )}
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground font-medium">
              {product.name}
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Galeria */}
          <ProductGallery images={product.images ?? []} productName={product.name} />

          {/* Informações */}
          <div className="space-y-5">
            {product.category && (
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
                {product.category.name}
              </p>
            )}

            <h1 className="text-3xl font-bold text-foreground leading-tight text-balance">
              {product.name}
            </h1>

            <PriceFormatter
              price={product.price}
              comparePrice={product.comparePrice}
              className="text-2xl"
            />

            {/* Disponibilidade */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full ${inStock ? 'bg-success' : 'bg-error'}`}
                aria-hidden="true"
              />
              <span className={`text-sm font-medium ${inStock ? 'text-success' : 'text-error'}`}>
                {inStock ? 'Em estoque' : 'Produto esgotado'}
              </span>
            </div>

            {/* Descrições */}
            {product.shortDescription && (
              <p className="text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {product.description && (
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-2">
                  Descrição
                </h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Marca */}
            {product.brand && (
              <div className="text-sm">
                <span className="text-muted-foreground">Marca: </span>
                <span className="text-foreground font-medium">{product.brand.name}</span>
              </div>
            )}

            {/* Ações (client) */}
            <ProductActions productId={product.id} stock={product.stock} />
          </div>
        </div>
      </div>
    </div>
  );
}
