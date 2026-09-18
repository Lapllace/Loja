'use client';



import { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import Image from 'next/image';

import { Category } from '@/lib/types';

import { SearchBar } from '@/components/ui/SearchBar';

import { useAuth } from '@/hooks/useAuth';

import { useCart } from '@/providers/CartProvider';

import { useCartUi } from '@/providers/CartUiProvider';

interface HeaderProps {

  categories: Category[];

}



/**

 * Header da vitrine (Client Component com autenticação).

 * Recebe as categorias já buscadas no layout para evitar chamadas duplicadas.

 */

export function Header({ categories }: HeaderProps) {

  const { user, isAuthenticated, logout, loading } = useAuth();

  const { itemCount } = useCart();

  const { openCart } = useCartUi();

  const cartCount = itemCount;

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const handleLogout = () => {

    logout();

  };

  // Hide on scroll: oculta o header ao descer e reexibe ao subir.

  const [hidden, setHidden] = useState(false);

  const lastScrollY = useRef(0);

  useEffect(() => {

    const handleScroll = () => {

      const currentScrollY = window.scrollY;

      // Só alterna depois de sair do topo, evitando flicker em micro-rolagens.

      if (currentScrollY > lastScrollY.current && currentScrollY > 80) {

        setHidden(true);

      } else if (currentScrollY < lastScrollY.current) {

        setHidden(false);

      }

      lastScrollY.current = currentScrollY;

    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);

  }, []);

  return (

    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-ink/95 text-white backdrop-blur-md transition-transform duration-300 ease-in-out ${

        hidden ? '-translate-y-full' : 'translate-y-0'

      }`}

    >

      <div className="container-custom">

        {/* Barra principal */}

        <div className="flex items-center gap-4 py-3 md:py-4">

          {/* Logo */}

          <Link href="/loja" className="flex items-center shrink-0" aria-label="Página inicial">

            <Image

              src="/branding/logo.jpg"

              alt="Gil Imports"

              width={140}

              height={44}

              className="h-11 w-auto"

              priority

            />

          </Link>



          {/* Busca - Desktop */}

          <div className="hidden md:block flex-1 max-w-xl mx-auto">

            <SearchBar />

          </div>



          {/* Ações */}

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">

            {/* Carrinho (ativo) */}

            <button
              type="button"

              onClick={openCart}

              title="Abrir carrinho"

              aria-label={`Abrir carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})`}

              aria-haspopup="dialog"

              className="relative inline-flex size-9 sm:size-10 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink cursor-pointer"

            >


              <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.014 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />

              </svg>


                {cartCount > 0 && (

                  <span
                    className="cart-count bg-accent text-ink absolute -top-1 -right-1"

                    aria-label={`${cartCount} itens no carrinho`}

                  >

                    {cartCount > 99 ? '99+' : cartCount}

                  </span>

                )}

              </button>



            {/* Auth buttons */}

            {loading ? (

              <div className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink opacity-50">

                Carregando...

              </div>

            ) : isAuthenticated ? (

              <>

                {isAdmin && (

                  <Link
                    href="/admin/produtos/novo"

                    className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent/60"

                  >

                    Painel Admin / Cadastrar Produto
                  </Link>

                )}

                <Link
                  href="/conta"

                  title="Minha Conta"

                  aria-label="Minha Conta"

                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-ink transition-all duration-200 hover:bg-accent-dark focus-visible:ring-2 focus-visible:ring-accent/60"

                >

                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0v.75H4.5v-.75z" />

                  </svg>

                  <span className="hidden sm:inline">{user?.name}</span>

                  <span className="sm:hidden">Conta</span>

                </Link>

                <Link
                  href="/pedidos"
                  title="Meus Pedidos"
                  aria-label="Meus Pedidos"
                  className="hidden lg:inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  Meus Pedidos
                </Link>

                <button
                  onClick={handleLogout}

                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent/60"

                >

                  Sair
                </button>

              </>

            ) : (

              <>

                <Link
                  href="/login"

                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink transition-all duration-200 hover:bg-accent-dark focus-visible:ring-2 focus-visible:ring-accent/60"

                >

                  Entrar
                </Link>

                <Link
                  href="/cadastro"

                  className="hidden sm:inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-accent/60"

                >

                  Criar conta
                </Link>

              </>

            )}



            {/* Menu mobile via <details> (sem JS) */}

            <details className="md:hidden relative group">

              <summary
                className="inline-flex size-9 sm:size-10 items-center justify-center rounded-full text-white/80 transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer list-none [&::-webkit-details-marker]:hidden"

                aria-label="Abrir menu"

              >

                <svg className="size-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />

                </svg>

              </summary>

              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border-white/10 bg-ink p-2 shadow-2xl shadow-black/40 max-h-[70vh] overflow-y-auto">

                <Link

                  href="/loja"

                  className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                >

                  Início

                </Link>

                <Link

                  href="/loja/produtos"

                  className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                >

                  Todos os produtos

                </Link>

                {isAuthenticated && (

                  <>

                    <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">

                      Minha conta
                    </div>

                    <Link
                      href="/conta"

                      className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                    >

                      {user?.name}

                    </Link>

                    <Link
                      href="/pedidos"
                      className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"
                    >
                      Meus Pedidos
                    </Link>

                    {isAdmin && (

                      <Link
                        href="/admin/produtos/novo"

                        className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                      >

                        Painel Admin / Cadastrar Produto
                      </Link>

                    )}

                    <button

                      onClick={handleLogout}

                      className="block w-full text-left px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                    >

                      Sair

                    </button>

                  </>

                )}

                {!isAuthenticated && (

                  <>

                    <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">

                      Conta
                    </div>

                    <Link
                      href="/conta"

                      className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                    >

                      Minha Conta
                    </Link>

                    <Link
                      href="/login"

                      className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                    >

                      Entrar
                    </Link>

                    <Link
                      href="/cadastro"

                      className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                    >

                      Criar conta
                    </Link>

                  </>

                )}

                <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">

                  Categorias

                </div>

                {categories.map((category) => (

                  <Link

                    key={category.id}

                    href={`/loja/categorias/${category.slug}`}

                    className="block rounded-lg px-3 py-2.5 text-sm text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-white"

                  >

                    {category.name}

                  </Link>

                ))}

              </div>

            </details>

          </div>

        </div>



        {/* Busca - Mobile */}

        <div className="md:hidden pb-4">

          <SearchBar />

        </div>



        {/* Navegação de categorias - Desktop */}

        <nav className="hidden md:block border-t border-white/10" aria-label="Categorias">

          <ul className="flex items-center gap-1 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">

            <li>

              <Link

                  href="/loja"

                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-white"

                >

                  Início
                </Link>

            </li>

            <li>

              <Link

                  href="/loja/produtos"

                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-white"

                >

                  Produtos
                </Link>

            </li>

            <li aria-hidden="true" className="h-4 w-px bg-white/15 mx-1" />

            {categories.map((category) => (

              <li key={category.id}>

                <Link

                  href={`/loja/categorias/${category.slug}`}

                  className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition-all duration-200 hover:bg-white/10 hover:text-accent"

                >

                  {category.name}

                </Link>

              </li>

            ))}

          </ul>

        </nav>

      </div>

    </header>

  );

}

