'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/ui/LoadingState';

export default function AdminProductsPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isAdmin) router.replace('/');
  }, [isAdmin, isAuthenticated, loading, router]);

  if (loading) {
    return <LoadingState message="Verificando permissões..." className="min-h-[500px]" />;
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <main className="container-custom py-8 md:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
        Painel administrativo
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Produtos</h1>
      <p className="mt-2 text-muted-foreground">
        Gerencie os produtos cadastrados na loja.
      </p>
      <Link
        href="/admin/produtos/novo"
        className="mt-6 inline-flex rounded-lg bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent-dark"
      >
        Cadastrar produto
      </Link>
    </main>
  );
}
