import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer da vitrine (Server Component).
 * Mantém a comunicação factual enquanto dados de contato específicos não estão cadastrados.
 */
export function Footer() {
  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="container-custom py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <Image
              src="/branding/logo.jpg"
              alt="Gil Imports"
              width={150}
              height={150}
              className="h-11 w-auto object-contain mb-4"
            />
            <p className="max-w-xs text-sm leading-relaxed text-white/70">
              Produtos importados selecionados: acessórios para celular, fones, caixas de som,
              smartwatches, garrafas térmicas e perfumes árabes.
            </p>
          </div>

          {/* Institucional */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              Institucional
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/loja" className="text-white/70 transition-colors hover:text-white">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link href="/conta" className="text-white/70 transition-colors hover:text-white">
                  Trocas e Devoluções
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="text-white/70 transition-colors hover:text-white">
                  Dúvidas Frequentes
                </Link>
              </li>
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              Atendimento
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/conta" className="text-white/70 transition-colors hover:text-white">
                  Minha Conta
                </Link>
              </li>
              <li>
                <Link href="/pedidos" className="text-white/70 transition-colors hover:text-white">
                  Meus Pedidos
                </Link>
              </li>
              <li>
                <Link href="/loja/carrinho" className="text-white/70 transition-colors hover:text-white">
                  Meu Carrinho
                </Link>
              </li>
            </ul>
          </div>

          {/* Categorias Populares */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-accent">
              Categorias Populares
            </h3>
            <ul className="space-y-3 text-sm">
              <li><Link href="/loja/categorias/acessorios-para-celular" className="text-white/70 transition-colors hover:text-white">Acessórios para Celular</Link></li>
              <li><Link href="/loja/categorias/perfumes-arabes" className="text-white/70 transition-colors hover:text-white">Perfumes Árabes</Link></li>
              <li><Link href="/loja/produtos" className="text-white/70 transition-colors hover:text-white">Todos os produtos</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <span>Pagamento via PIX com aprovação imediata</span>
          <span className="font-semibold text-accent" aria-label="Pagamento PIX">PIX</span>
        </div>

        {/* Barra inferior */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Gil Imports. Todos os direitos reservados.</p>
          <p className="text-white/40">Produtos importados com qualidade garantida</p>
        </div>
      </div>
    </footer>
  );
}
