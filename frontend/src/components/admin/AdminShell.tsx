'use client';

/**
 * Casca visual do painel administrativo.
 *
 * - Desktop (lg+): sidebar fixa com grupos de navegação.
 * - Mobile/Tablet: topo com botão que abre Drawer (folha lateral) com a mesma
 *   navegação — sem duplicar a lista (a mesma estrutura alimenta os dois).
 *
 * Mostra apenas áreas suportadas pelo backend atual. "Busca de imagens" é
 * restrita a OWNER no backend (@Roles(OWNER) em /developer/image-search).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AdminNavItem {
  href: string;
  label: string;
  /** Exigido pelo backend para a área correspondente. */
  ownerOnly?: boolean;
}

interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: 'Catálogo',
    items: [
      { href: '/admin/produtos', label: 'Produtos' },
      { href: '/admin/categorias', label: 'Categorias' },
      { href: '/admin/marcas', label: 'Marcas' },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { href: '/admin/pedidos', label: 'Pedidos' },
      { href: '/admin/pagamentos', label: 'Pagamentos' },
      { href: '/admin/entregas', label: 'Entregas' },
    ],
  },
  {
    title: 'Clientes',
    items: [{ href: '/admin/usuarios', label: 'Usuários' }],
  },
  {
    title: 'Desenvolvedor',
    items: [{ href: '/admin/desenvolvedor/imagens', label: 'Busca de imagens', ownerOnly: true }],
  },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';
  // O Dashboard vive em /admin/dashboard; /admin apenas redireciona para lá.
  const isDashboard =
    pathname === '/admin/dashboard' || pathname.startsWith('/admin/dashboard/');

  return (
    <nav aria-label="Navegação administrativa" className="space-y-6">
      <Link
        href="/admin/dashboard"
        onClick={onNavigate}
        aria-current={isDashboard ? 'page' : undefined}
        className={`block rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${isDashboard
            ? 'bg-accent/10 text-accent'
            : 'text-foreground hover:bg-muted'
          }`}
      >
        Dashboard
      </Link>

      {ADMIN_NAV.map((group) => {
        const items = group.items.filter((item) => !item.ownerOnly || isOwner);
        if (items.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group.title}
            </p>
            <ul className="space-y-1">
              {items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${active
                          ? 'bg-accent/10 font-semibold text-accent'
                          : 'text-foreground hover:bg-muted'
                        }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      router.replace('/');
    }
  }, [loading, isAuthenticated, user, router]);

  // Fecha com ESC quando o drawer está aberto.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Verificando permissões...
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-3 text-muted-foreground">
            Esta área é exclusiva para administradores da loja.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark"
          >
            Entrar na conta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Topo mobile/tablet */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir navegação"
          aria-expanded={drawerOpen}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Menu
        </button>
        <Link href="/admin/dashboard" className="font-bold text-foreground">
          Painel Admin
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-border bg-background px-4 py-6 lg:block">
          <Link href="/admin/dashboard" className="mb-8 block rounded-xl px-3 text-lg font-bold text-foreground">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-accent">
              Loja
            </span>
            Painel administrativo
          </Link>
          <NavList />
          <div className="mt-8 rounded-xl border border-border bg-card px-3 py-3">
            <p className="truncate text-sm font-semibold text-foreground">{user?.name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
              {user?.role}
            </p>
          </div>
        </aside>

        {/* Drawer mobile/tablet */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              aria-label="Fechar navegação"
              onClick={() => setDrawerOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-background px-4 py-5 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-lg font-bold text-foreground">Painel Admin</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Fechar"
                  className="rounded-lg border-border px-2.5 py-1.5 text-sm text-foreground hover:bg-muted"
                >
                  ✕
                </button>
              </div>
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}
