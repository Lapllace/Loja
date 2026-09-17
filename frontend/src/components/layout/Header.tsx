'use client';



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



  const handleLogout = () => {

    logout();

  };



  return (

    <header className="bg-ink text-white sticky top-0 z-50 border-b border-white/10">

      <div className="container-custom">

        {/* Barra principal */}

        <div className="flex items-center gap-4 py-3.5">

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

          <div className="flex items-center gap-1 ml-auto">            {/* Carrinho (ativo) */}


            <button
              type="button"

              onClick={openCart}

              title="Abrir carrinho"

              aria-label={`Abrir carrinho (${cartCount} ${cartCount === 1 ? 'item' : 'itens'})`}

              aria-haspopup="dialog"

              className="relative p-2.5 rounded-lg text-white/80 hover:bg-white/5 transition-colors cursor-pointer"

            >


              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">


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

              <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-ink opacity-50">

                Carregando...

              </div>

            ) : isAuthenticated ? (

              <>

                <Link

                  href="/minha-conta"

                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-ink hover:bg-accent/90"

                >

                  {user?.name}

                </Link>

                <button

                  onClick={handleLogout}

                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20"

                >

                  Sair

                </button>

              </>

            ) : (

              <>

                <Link

                  href="/login"

                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-ink hover:bg-accent/90"

                >

                  Entrar

                </Link>

                <Link

                  href="/cadastro"

                  className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20"

                >

                  Criar conta

                </Link>

              </>

            )}



            {/* Menu mobile via <details> (sem JS) */}

            <details className="md:hidden relative group">

              <summary

                className="p-2.5 rounded-lg text-white/80 hover:bg-white/5 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden"

                aria-label="Abrir menu"

              >

                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />

                </svg>

              </summary>

              <div className="absolute right-0 top-full mt-2 w-64 bg-ink border border-white/10 rounded-xl shadow-xl p-2 max-h-[70vh] overflow-y-auto">

                <Link

                  href="/loja"

                  className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                >

                  Início

                </Link>

                <Link

                  href="/loja/produtos"

                  className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                >

                  Todos os produtos

                </Link>

                {isAuthenticated && (

                  <>

                    <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wider text-white/40">

                      Minha conta

                    </div>

                    <Link

                      href="/minha-conta"

                      className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                    >

                      {user?.name}

                    </Link>

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

                      href="/login"

                      className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                    >

                      Entrar

                    </Link>

                    <Link

                      href="/cadastro"

                      className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

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

                    className="block px-3 py-2.5 rounded-lg text-sm text-white/90 hover:bg-white/5"

                  >

                    {category.name}

                  </Link>

                ))}

              </div>

            </details>

          </div>

        </div>



        {/* Busca - Mobile */}

        <div className="md:hidden pb-3.5">

          <SearchBar />

        </div>



        {/* Navegação de categorias - Desktop */}

        <nav className="hidden md:block border-t border-white/10" aria-label="Categorias">

          <ul className="flex items-center gap-1 py-2 overflow-x-auto">

            <li>

              <Link

                href="/loja"

                className="block px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/5 whitespace-nowrap transition-colors"

              >

                Início

              </Link>

            </li>

            <li>

              <Link

                href="/loja/produtos"

                className="block px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/5 whitespace-nowrap transition-colors"

              >

                Produtos

              </Link>

            </li>

            <li aria-hidden="true" className="h-4 w-px bg-white/15 mx-1" />

            {categories.map((category) => (

              <li key={category.id}>

                <Link

                  href={`/loja/categorias/${category.slug}`}

                  className="block px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/5 hover:text-accent whitespace-nowrap transition-colors"

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

