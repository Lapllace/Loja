'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Category } from '@/lib/types';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/providers/CartProvider';
import { useCartUi } from '@/providers/CartUiProvider';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface HeaderProps {
  categories: Category[];
}

function CartIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.014 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.7}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0v.75H4.5v-.75z"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="size-4 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Header da vitrine.
 * Recebe as categorias já buscadas no layout para evitar chamadas duplicadas.
 */
export function Header({ categories }: HeaderProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { itemCount } = useCart();
  const { openCart } = useCartUi();

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const isHome = pathname === '/' || pathname === '/loja';
  const isProducts = pathname.startsWith('/loja/produtos');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // O menu móvel é fechado explicitamente pelos links e pelo botão de fechar.

  // Bloqueia o scroll e permite fechar com Esc enquanto o menu está aberto.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const navLinkClass = (active: boolean) =>
    `inline-flex h-10 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors ${
      active
        ? 'bg-accent-soft text-accent'
        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    }`;

  const mobileLinkClass =
    'flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted';

  return (
    <header
      className={`sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl transition-shadow duration-200 ${
        scrolled ? 'shadow-[0_12px_30px_-22px_rgba(10,31,68,0.45)]' : ''
      }`}
    >
      <div className="container-custom">
        {/* Barra principal */}
        <div className="flex h-16 items-center gap-3 sm:h-[72px] sm:gap-5">
          <Link href="/" className="flex shrink-0 items-center" aria-label="Gil Imports — página inicial">
            <Image
              src="/branding/logo.jpg"
              alt="Gil Imports"
              width={150}
              height={150}
              className="h-10 w-auto object-contain sm:h-11"
              priority
            />
          </Link>

          {/* Busca — desktop */}
          <div className="hidden flex-1 justify-center md:flex">
            <SearchBar className="w-full max-w-xl" />
          </div>

          {/* Ações */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {loading ? (
              <div
                className="hidden h-10 w-24 animate-pulse rounded-full bg-muted sm:block"
                aria-hidden="true"
              />
            ) : isAuthenticated ? (
              <>
                <Link
                  href="/conta"
                  title="Minha conta"
                  className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:border-accent/40 hover:text-accent sm:inline-flex"
                >
                  <UserIcon />
                  <span className="hidden max-w-32 truncate lg:inline">{user?.name}</span>
                  <span className="lg:hidden">Conta</span>
                </Link>

                <Link
                  href="/pedidos"
                  className="hidden h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:inline-flex"
                >
                  Meus pedidos
                </Link>

                <button
                  type="button"
                  onClick={logout}
                  className="hidden h-10 items-center rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:inline-flex"
                >
                  Sair
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden h-10 items-center rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted sm:inline-flex"
                >
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="hidden h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-dark sm:inline-flex"
                >
                  Criar conta
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={openCart}
              title="Abrir carrinho"
              aria-label={`Abrir carrinho (${itemCount} ${itemCount === 1 ? 'item' : 'itens'})`}
              aria-haspopup="dialog"
              className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <CartIcon />
              {itemCount > 0 && (
                <span
                  className="cart-count absolute -right-1 -top-1 bg-accent text-white"
                  aria-label={`${itemCount} itens no carrinho`}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Busca — mobile */}
        <div className="pb-3 md:hidden">
          <SearchBar />
        </div>

        {/* Navegação — desktop */}
        <nav className="hidden border-t border-border/70 md:block" aria-label="Categorias">
          <ul className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1.5">
            <li>
              <Link href="/" className={navLinkClass(isHome)} aria-current={isHome ? 'page' : undefined}>
                Início
              </Link>
            </li>
            <li>
              <Link
                href="/loja/produtos"
                className={navLinkClass(isProducts)}
                aria-current={isProducts ? 'page' : undefined}
              >
                Produtos
              </Link>
            </li>

            <li aria-hidden="true" className="mx-2 h-5 w-px shrink-0 bg-border" />

            {categories.map((category) => {
              const active = pathname === `/loja/categorias/${category.slug}`;
              return (
                <li key={category.id}>
                  <Link
                    href={`/loja/categorias/${category.slug}`}
                    className={navLinkClass(active)}
                    aria-current={active ? 'page' : undefined}
                  >
                    {category.name}
                  </Link>
                </li>
              );
            })}

            {isAdmin && (
              <li className="ml-auto pl-4">
                <Link
                  href="/admin/produtos/novo"
                  className="inline-flex h-10 items-center whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-sm font-semibold text-foreground transition-colors hover:border-accent/40 hover:text-accent"
                >
                  + Cadastrar produto
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <div
            className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute inset-y-0 right-0 flex w-[min(92vw,26rem)] flex-col bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <Link href="/" onClick={closeMenu} className="flex items-center" aria-label="Gil Imports — página inicial">
                <Image
                  src="/branding/logo.jpg"
                  alt="Gil Imports"
                  width={150}
                  height={150}
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                autoFocus
                aria-label="Fechar menu"
                className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground transition-colors hover:border-accent/40 hover:text-accent"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              <SearchBar />

              <nav className="mt-6" aria-label="Menu principal">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Navegar
                </p>
                <div className="mt-2 space-y-1">
                  <Link href="/" onClick={closeMenu} className={mobileLinkClass}>
                    Início
                  </Link>
                  <Link href="/loja/produtos" onClick={closeMenu} className={mobileLinkClass}>
                    Todos os produtos
                    <ChevronIcon />
                  </Link>
                </div>
              </nav>

              <div className="mt-6">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Categorias
                </p>
                <div className="mt-2 space-y-1">
                  {categories.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">
                      Nenhuma categoria disponível.
                    </p>
                  ) : (
                    categories.map((category) => (
                      <Link
                        key={category.id}
                        href={`/loja/categorias/${category.slug}`}
                        onClick={closeMenu}
                        className={mobileLinkClass}
                      >
                        {category.name}
                        <ChevronIcon />
                      </Link>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Conta
                </p>
                <div className="mt-2 space-y-1">
                  {isAuthenticated ? (
                    <>
                      <Link href="/conta" onClick={closeMenu} className={mobileLinkClass}>
                        Minha conta
                        <ChevronIcon />
                      </Link>
                      <Link href="/pedidos" onClick={closeMenu} className={mobileLinkClass}>
                        Meus pedidos
                        <ChevronIcon />
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin/produtos/novo"
                          onClick={closeMenu}
                          className={mobileLinkClass}
                        >
                          Cadastrar produto
                          <ChevronIcon />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          closeMenu();
                          logout();
                        }}
                        className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Sair
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={closeMenu} className={mobileLinkClass}>
                        Entrar
                        <ChevronIcon />
                      </Link>
                      <Link href="/cadastro" onClick={closeMenu} className={mobileLinkClass}>
                        Criar conta
                        <ChevronIcon />
                      </Link>
                      <Link href="/conta" onClick={closeMenu} className={mobileLinkClass}>
                        Minha conta
                        <ChevronIcon />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border px-4 py-4">
              <span className="text-sm font-medium text-muted-foreground">Aparência</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
