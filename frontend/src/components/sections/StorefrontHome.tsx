import Link from 'next/link';
import { api } from '@/lib/api';
import { Product } from '@/lib/types';
import { CategoryCard } from '@/components/category/CategoryCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { BenefitsSection } from '@/components/sections/BenefitsSection';
import { SafeImage } from '@/components/ui/SafeImage';
import { formatPrice } from '@/lib/utils';

function ArrowIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="size-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function HeroVisual({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-ink p-8 text-white shadow-2xl shadow-ink/20 sm:p-10">
        <div
          className="absolute -right-16 -top-16 size-56 rounded-full border border-white/15"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 -left-10 size-48 rounded-full bg-accent/30 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex min-h-72 flex-col justify-between">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white/10">
            <svg className="size-6 text-accent-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-bright">
              Seleção da loja
            </p>
            <p className="mt-2 text-2xl font-bold leading-tight">
              Novidades chegando ao catálogo.
            </p>
            <p className="mt-3 text-sm text-white/70">
              Enquanto isso, explore as categorias e os produtos disponíveis.
            </p>
            <Link
              href="/loja/produtos"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-accent-soft"
            >
              Ver produtos
              <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [primary, secondary] = products;
  const primaryImage = primary.images?.[0];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <Link
        href={`/loja/produtos/${primary.slug}`}
        className="group relative col-span-2 aspect-[16/11] overflow-hidden rounded-3xl border border-white/70 bg-card shadow-2xl shadow-ink/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SafeImage
          src={primaryImage?.url || null}
          alt={primaryImage?.alt || primary.name}
          fill
          priority
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/95 via-ink/55 to-transparent p-5 pt-20 text-white sm:p-6">
          {primary.category && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-bright">
              {primary.category.name}
            </p>
          )}
          <p className="mt-1.5 line-clamp-1 text-lg font-semibold sm:text-xl">
            {primary.name}
          </p>
          <p className="mt-1 text-sm text-white/80">{formatPrice(primary.price)}</p>
        </div>
      </Link>

      {secondary ? (
        <Link
          href={`/loja/produtos/${secondary.slug}`}
          className="group relative aspect-square overflow-hidden rounded-3xl border border-white/70 bg-card shadow-lg shadow-ink/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <SafeImage
            src={secondary.images?.[0]?.url || null}
            alt={secondary.images?.[0]?.alt || secondary.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 1024px) 50vw, 22vw"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4 pt-14 text-white">
            <p className="line-clamp-1 text-sm font-semibold">{secondary.name}</p>
          </div>
        </Link>
      ) : (
        <div className="flex aspect-square flex-col justify-between rounded-3xl border border-border/70 bg-card p-5 shadow-lg shadow-ink/5">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <CheckIcon />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Compra simples
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-snug text-foreground">
              Produtos selecionados e disponíveis para envio.
            </p>
          </div>
        </div>
      )}

      <div className="flex aspect-square flex-col justify-between rounded-3xl bg-accent p-5 text-white shadow-lg shadow-accent/20">
        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/15">
          <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
            Envio nacional
          </p>
          <p className="mt-1.5 text-sm font-semibold leading-snug">
            Enviamos para todo o Brasil.
          </p>
        </div>
      </div>
    </div>
  );
}

export async function StorefrontHome() {
  const [categories, products] = await Promise.all([
    api.getActiveCategories({
      next: { revalidate: 300, tags: ['categories'] },
    }),
    api.getProducts(
      { active: true, inStock: true },
      { field: 'createdAt', order: 'desc' },
      { next: { revalidate: 60, tags: ['products'] } },
    ),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f3f7ff_55%,#eef4ff_100%)]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-accent-bright/10 blur-3xl" />
          <div className="absolute -left-32 bottom-0 size-[24rem] rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(29,78,216,0.10)_1px,transparent_0)] opacity-60 [background-size:22px_22px]" />
        </div>

        <div className="container-custom relative grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-white/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent shadow-sm backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent-bright" aria-hidden="true" />
              Curadoria Gil Imports
            </span>

            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
              Tecnologia e estilo para o seu dia a dia.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Acessórios para celular, fones, caixas de som, smartwatches, garrafas térmicas
              e perfumes árabes — selecionados para você comprar com confiança.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/loja/produtos"
                className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-accent px-7 text-base font-semibold text-white shadow-sm shadow-accent/20 transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                Explorar catálogo
                <ArrowIcon />
              </Link>
              <Link
                href="#categorias"
                className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-input bg-background px-7 text-base font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-auto"
              >
                Ver categorias
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-muted-foreground">
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                Envio para todo o Brasil
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                Pagamento via PIX
              </li>
              <li className="inline-flex items-center gap-2">
                <CheckIcon />
                Atendimento humanizado
              </li>
            </ul>
          </div>

          <HeroVisual products={products.slice(0, 2)} />
        </div>
      </section>

      {/* Categorias */}
      <section id="categorias" className="scroll-mt-32 py-14 md:py-20">
        <div className="container-custom">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between md:mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Navegue por categoria
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                Encontre o que combina com você
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Do tech ao perfume: explore a seleção por tipo de produto.
              </p>
            </div>

            <Link
              href="/loja/produtos"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-dark"
            >
              Ver todos os produtos
              <ArrowIcon className="size-4" />
            </Link>
          </div>

          {categories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
              <p className="font-semibold text-foreground">Nenhuma categoria disponível no momento.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Estamos organizando a vitrine. Volte em breve ou veja todos os produtos.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Produtos em destaque */}
      <section className="border-y border-border/70 bg-muted/40 py-14 md:py-20">
        <div className="container-custom">
          <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Seleção da loja
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                Destaques para você
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
                Produtos disponíveis, prontos para envio.
              </p>
            </div>
            <Link
              href="/loja/produtos"
              className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-accent transition-colors hover:text-accent-dark sm:inline-flex"
            >
              Ver catálogo
              <ArrowIcon className="size-4" />
            </Link>
          </div>

          <ProductGrid
            products={products}
            columns={4}
            emptyTitle="Nenhum produto disponível"
            emptyDescription="Novos produtos chegam em breve. Enquanto isso, explore as categorias."
          />

          <div className="mt-8 sm:hidden">
            <Link
              href="/loja/produtos"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-input bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:bg-muted"
            >
              Ver todos os produtos
            </Link>
          </div>
        </div>
      </section>

      <BenefitsSection />

      {/* CTA */}
      <section className="py-14 md:py-16">
        <div className="container-custom">
          <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white md:px-12 md:py-16">
            <div
              className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-accent/30 blur-3xl"
              aria-hidden="true"
            />
            <div
              className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-accent-bright/20 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-bright">
                Gil Imports
              </p>
              <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                Pronto para encontrar o seu próximo favorito?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/70 md:text-base">
                Explore o catálogo completo e descubra produtos importados selecionados
                para o seu dia a dia.
              </p>
              <Link
                href="/loja/produtos"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-accent px-7 text-base font-semibold text-white transition-colors hover:bg-accent-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                Começar a explorar
                <ArrowIcon />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
