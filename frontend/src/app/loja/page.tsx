import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CategoryCard } from '@/components/category/CategoryCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';
import { BenefitsSection } from '@/components/sections/BenefitsSection';

export const metadata: Metadata = {
  title: 'Início',
  description:
    'Acessórios para celular, fones, caixas de som, smartwatches, garrafas térmicas e perfumes árabes importados.',
  alternates: { canonical: '/loja' },
};

// Home da vitrine (Server Component) - revalida a cada 60s
export const revalidate = 60;

export default async function LojaHomePage() {
  // Chamadas em paralelo para evitar waterfall
  const [categories, bestSellers] = await Promise.all([
    api.getActiveCategories({ next: { revalidate: 300, tags: ['categories'] } }),
    api.getProducts(
      { active: true, inStock: true },
      { field: 'createdAt', order: 'desc' },
      { next: { revalidate: 60, tags: ['products'] } },
    ),
  ]);

  return (
    <div>
      <section className="relative overflow-hidden bg-ink py-12 text-white md:py-16">
        <div className="container-custom">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Gil Imports</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
              Tecnologia e estilo para o seu dia a dia.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              Acessórios, eletrônicos e produtos importados selecionados com cuidado para você comprar com confiança.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/loja/produtos">
                <Button size="lg">Explorar Catálogo</Button>
              </Link>
              <a
                href="https://wa.me/?text=Olá%20Gil%20Imports"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-white/20 px-7 text-base font-semibold text-white transition-all duration-200 hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Mais Vendidos e Procurados */}
      <section className="bg-muted/60 py-14 md:py-20">
        <div className="container-custom">
          <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Seleção da loja</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                Mais Vendidos e Procurados
              </h2>
              <p className="mt-2 text-muted-foreground">
                Os favoritos da nossa loja, prontos para envio
              </p>
            </div>
            <Link href="/loja/produtos" className="hidden sm:block shrink-0">
              <Button variant="ghost" size="sm">
                Ver todos os produtos
              </Button>
            </Link>
          </div>

          <ProductGrid
            products={bestSellers}
            columns={4}
            emptyTitle="Nenhum produto disponível"
            emptyDescription="Em breve traremos novidades para você."
          />

          <div className="mt-8 sm:hidden">
            <Link href="/loja/produtos">
              <Button variant="outline" className="w-full">
                Ver todos os produtos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <BenefitsSection />

      {/* Categorias */}
      <section className="py-14 md:py-20">
        <div className="container-custom">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Encontre seu próximo favorito</p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                Categorias
              </h2>
              <p className="mt-2 text-muted-foreground">
                Explore por tipo de produto
              </p>
            </div>
          </div>

          {categories.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              Nenhuma categoria disponível no momento.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-5">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="bg-ink rounded-2xl px-8 py-12 md:px-12 md:py-16 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-balance">
              Pronto para encontrar o produto perfeito?
            </h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Explore nosso catálogo completo e descubra produtos importados
              com preços especiais.
            </p>
            <Link href="/loja/produtos">
              <Button size="lg">Começar a explorar</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
