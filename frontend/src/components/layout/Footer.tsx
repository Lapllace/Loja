import Link from 'next/link';
import Image from 'next/image';

/**
 * Footer da vitrine (Server Component).
 * Informações de contato reais não foram fornecidas ainda —
 * exibimos apenas o essencial, sem inventar telefone/e-mail/endereço.
 */
export function Footer() {
  return (
    <footer className="bg-ink text-white mt-20">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Marca */}
          <div>
            <Image
              src="/branding/logo.jpg"
              alt="Gil Imports"
              width={140}
              height={44}
              className="h-11 w-auto mb-4"
            />
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Produtos importados selecionados: acessórios para celular, fones, caixas de som,
              smartwatches, garrafas térmicas e perfumes árabes.
            </p>
          </div>

          {/* Navegação */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-accent">
              Navegação
            </h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/loja" className="text-white/70 hover:text-white transition-colors text-sm">
                  Início
                </Link>
              </li>
              <li>
                <Link href="/loja/produtos" className="text-white/70 hover:text-white transition-colors text-sm">
                  Todos os produtos
                </Link>
              </li>
              <li>
                <Link href="/loja/categorias/acessorios-para-celular" className="text-white/70 hover:text-white transition-colors text-sm">
                  Acessórios para Celular
                </Link>
              </li>
              <li>
                <Link href="/loja/categorias/perfumes-arabes" className="text-white/70 hover:text-white transition-colors text-sm">
                  Perfumes Árabes
                </Link>
              </li>
            </ul>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-accent">
              Atendimento
            </h3>
            <p className="text-white/70 text-sm leading-relaxed">
              Dúvidas sobre produtos, trocas e entregas? Em breve teremos um canal
              dedicado de atendimento ao cliente.
            </p>
          </div>
        </div>

        {/* Barra inferior */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/50">
          <p>&copy; {new Date().getFullYear()} Gil Imports. Todos os direitos reservados.</p>
          <p className="text-white/40">Produtos importados com qualidade garantida</p>
        </div>
      </div>
    </footer>
  );
}
