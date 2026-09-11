import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CategoryCard } from '@/components/category/CategoryCard';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Button } from '@/components/ui/Button';

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
  const [categories, featuredProducts] = await Promise.all([
    api.getActiveCategories({ next: { revalidate: 300, tags: ['categories'] } }),
    api.getProducts(
      { featured: true, active: true, inStock: true },
      { field: 'createdAt', order: 'desc' },
      { next: { revalidate: 60, tags: ['products'] } },
    ),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="container-custom py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-accent text-sm font-semibold uppercase tracking-[0.2em] mb-4">
              Produtos importados
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5 text-balance">
              Bem-vindo à Gil Imports
            </h1>
            <p className="text-lg md:text-xl text-white/75 mb-8 leading-relaxed">
              Acessórios para celular, fones, caixas de som, smartwatches, garrafas
              térmicas e perfumes árabes selecionados com qualidade garantida.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/loja/produtos">
                <Button size="lg">Ver produtos</Button>
              </Link>
              <Link href="/loja/produtos?featured=true">
                <Button variant="outline" size="lg" className="border-accent text-accent hover:bg-accent hover:text-ink">
                  Destaques
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Categorias
              </h2>
              <p className="text-muted-foreground mt-1">
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

      {/* Destaques */}
      <section className="py-12 md:py-16 bg-muted/60">
        <div className="container-custom">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                Em destaque
              </h2>
              <p className="text-muted-foreground mt-1">
                Seleção especial da semana
              </p>
            </div>
            <Link href="/loja/produtos?featured=true" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Ver todos
              </Button>
            </Link>
          </div>

          <ProductGrid
            products={featuredProducts}
            columns={3}
            emptyTitle="Nenhum produto em destaque"
            emptyDescription="Em breve traremos novidades para você."
          />
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
