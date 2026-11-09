import type { ReactNode } from 'react';
import { api } from '@/lib/api';
import { AnnouncementBar } from './AnnouncementBar';
import { Header } from './Header';
import { Footer } from './Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

/**
 * Chrome compartilhado da vitrine.
 * Centraliza a busca de categorias usada pelo header, pelo menu mobile e pelo footer.
 */
export async function StorefrontShell({ children }: { children: ReactNode }) {
  const categories = await api.getActiveCategories({
    next: { revalidate: 300, tags: ['categories'] },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AnnouncementBar />
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer categories={categories} />
      {/* Gaveta lateral do carrinho, controlada por CartUiProvider */}
      <CartDrawer />
    </div>
  );
}
