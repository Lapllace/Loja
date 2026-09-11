import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { api } from '@/lib/api';

// Layout da vitrine busca as categorias uma única vez (revalida a cada 5 min)
export const revalidate = 300;

export default async function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await api.getActiveCategories(
    { next: { revalidate: 300, tags: ['categories'] } },
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header categories={categories} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

