import Link from 'next/link';
import Image from 'next/image';
import { Category } from '@/lib/types';

interface FooterProps {
  categories: Category[];
}

/**
 * Footer da vitrine (Server Component).
 * As categorias vêm da API para evitar links fixos que podem não existir.
 */
export function Footer({ categories }: FooterProps) {
  const popularCategories = categories.slice(0, 5);

  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="container-custom py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.1fr]">
          {/* Marca */}
          <div>
            <div className="inline-flex rounded-2xl bg-white p-2.5">
              <Image
                src="/branding/logo.jpg"
                alt="Gil Imports"
                width={150}
                height={150}
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
              Produtos importados selecionados: acessórios para celular, fones, caixas de som,
              smartwatches, garrafas térmicas e perfumes árabes.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/80">
              <svg className="size-4 text-accent-bright" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Pagamento via PIX
            </div>
          </div>

          {/* Navegar */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-accent-bright">
              Navegar
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/" className="text-white/70 transition-colors hover:text-white">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/loja/produtos" className="text-white/70 transition-colors hover:text-white">
                  Todos os produtos
                </Link>
              </li>
              <li>
                <Link href="/loja/produtos?featured=true" className="text-white/70 transition-colors hover:text-white">
                  Destaques
                </Link>
              </li>
              <li>
                <Link href="/loja#categorias" className="text-white/70 transition-colors hover:text-white">
                  Categorias
                </Link>
              </li>
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-accent-bright">
              Atendimento
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/conta" className="text-white/70 transition-colors hover:text-white">
                  Minha conta
                </Link>
              </li>
              <li>
                <Link href="/pedidos" className="text-white/70 transition-colors hover:text-white">
                  Meus pedidos
                </Link>
              </li>
              <li>
                <Link href="/loja/carrinho" className="text-white/70 transition-colors hover:text-white">
                  Meu carrinho
                </Link>
              </li>
              <li>
                <a
                  href="https://wa.me/?text=Ol%C3%A1%20Gil%20Imports"
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/70 transition-colors hover:text-white"
                >
                  Falar no WhatsApp
                </a>
              </li>
            </ul>
          </div>

          {/* Categorias */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-accent-bright">
              Categorias
            </h3>
            <ul className="space-y-3 text-sm">
              {popularCategories.length === 0 ? (
                <li>
                  <Link href="/loja/produtos" className="text-white/70 transition-colors hover:text-white">
                    Todos os produtos
                  </Link>
                </li>
              ) : (
                popularCategories.map((category) => (
                  <li key={category.id}>
                    <Link
                      href={`/loja/categorias/${category.slug}`}
                      className="text-white/70 transition-colors hover:text-white"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Gil Imports. Todos os direitos reservados.</p>
          <p className="text-white/40">Produtos importados selecionados</p>
        </div>
      </div>
    </footer>
  );
}
