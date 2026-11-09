import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, resolveImageUrl } from '@/lib/api';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductActions } from '@/components/product/ProductActions';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
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
      <div className="pb-16 pt-6 md:pt-8">
        <div className="container-custom">
          <div className="rounded-2xl border border-border bg-card">
            <EmptyState
              title="Não foi possível carregar o produto"
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

  if (!product) {
    notFound();
  }

  const inStock = isInStock(product.stock);

  return (
    <div className="pb-16 pt-6 md:pt-8">
      <div className="container-custom">
        <Breadcrumbs
          className="mb-6"
          items={[
            { label: 'Início', href: '/loja' },
            { label: 'Produtos', href: '/loja/produtos' },
            ...(product.category
              ? [
                  {
                    label: product.category.name,
                    href: `/loja/categorias/${product.category.slug}`,
                  },
                ]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Galeria */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <ProductGallery images={product.images ?? []} productName={product.name} />
          </div>

          {/* Informações */}
          <div className="min-w-0">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                {product.category && (
                  <Link
                    href={`/loja/categorias/${product.category.slug}`}
                    className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent/15"
                  >
                    {product.category.name}
                  </Link>
                )}

                {product.brand && (
                  <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {product.brand.name}
                  </span>
                )}
              </div>

              <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground md:text-4xl">
                {product.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">
                  SKU
                  <span className="font-semibold text-foreground">{product.sku}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${
                    inStock
                      ? 'bg-success/10 text-success'
                      : 'bg-error/10 text-error'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${inStock ? 'bg-success' : 'bg-error'}`}
                    aria-hidden="true"
                  />
                  {inStock ? 'Em estoque' : 'Produto esgotado'}
                </span>
              </div>
            </header>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preço
              </p>
              <PriceFormatter
                price={product.price}
                comparePrice={product.comparePrice}
                size="xl"
                className="mt-1"
              />
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Formas de pagamento e frete são exibidos no checkout.
              </p>
            </div>

            {product.shortDescription && (
              <p className="mt-5 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
                {product.shortDescription}
              </p>
            )}

            {/* Ações (client) */}
            <ProductActions productId={product.id} stock={product.stock} />

            {/* Descrição e especificações */}
            <div className="mt-7 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              <details open className="group/details">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground marker:hidden">
                  Descrição
                  <span
                    className="text-lg leading-none text-accent transition-transform group-open/details:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <div className="px-5 pb-5">
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {product.description || 'Detalhes do produto disponíveis em breve.'}
                  </p>
                </div>
              </details>

              <details className="group/details">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground marker:hidden">
                  Especificações
                  <span
                    className="text-lg leading-none text-accent transition-transform group-open/details:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <dl className="space-y-2.5 px-5 pb-5 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="text-right font-medium text-foreground">{product.sku}</dd>
                  </div>
                  {product.category && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">Categoria</dt>
                      <dd className="text-right font-medium text-foreground">
                        {product.category.name}
                      </dd>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">Marca</dt>
                      <dd className="text-right font-medium text-foreground">
                        {product.brand.name}
                      </dd>
                    </div>
                  )}
                </dl>
              </details>
            </div>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              <li className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
                <svg className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                Enviamos para todo o Brasil.
              </li>
              <li className="flex items-start gap-3 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
                <svg className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Estoque verificado em tempo real.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
