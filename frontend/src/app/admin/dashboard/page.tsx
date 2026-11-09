'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard, AdminStatGrid } from '@/components/admin/AdminStatCard';
import { FeedbackBanner } from '@/components/admin/FeedbackBanner';
import type { Order } from '@/lib/types';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    const loadStats = async () => {
      try {
        setLoadError(null);
        const [products, ordersResult, usersResult] = await Promise.all([
          api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
          api.getOrders(),
          api.getUsers({ next: { revalidate: 0 } }),
        ]);

        const activeProducts = products.filter((p) => p.active).length;

        const orderList: Order[] = ordersResult.ok ? ordersResult.data : [];
        const userCount = usersResult.ok ? usersResult.data.length : 0;

        const pendingOrders = orderList.filter((o) => o.status === 'PENDING').length;
        const totalRevenue = user?.role === 'OWNER'
          ? orderList
            .filter((o) => o.status === 'PAID' || o.status === 'DELIVERED')
            .reduce((sum, order) => sum + Number(order.total), 0)
          : 0;

        setStats({
          totalProducts: products.length,
          activeProducts,
          totalOrders: orderList.length,
          pendingOrders,
          totalUsers: userCount,
          totalRevenue,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
        setLoadError('Não foi possível carregar os indicadores. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isAdmin, user?.role]);

  if (!isAdmin) return null;

  if (loading) {
    return <LoadingState message="Carregando dashboard..." className="min-h-[400px]" />;
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Painel administrativo"
        title="Dashboard"
        description="Acompanhe o catálogo, os pedidos e a operação da loja."
      />

      {loadError && (
        <FeedbackBanner tone="error" className="mb-5">
          {loadError}
        </FeedbackBanner>
      )}

      <AdminStatGrid>
        <AdminStatCard
          href="/admin/produtos"
          label="Produtos"
          value={stats.totalProducts}
          hint={`${stats.activeProducts} ativos`}
          tone="accent"
        />
        <AdminStatCard
          href="/admin/pedidos"
          label="Pedidos"
          value={stats.totalOrders}
          hint={`${stats.pendingOrders} pendentes`}
          tone="warning"
        />
        <AdminStatCard
          href="/admin/usuarios"
          label="Usuários"
          value={stats.totalUsers}
          hint="Contas cadastradas"
        />
        {user?.role === 'OWNER' && (
          <AdminStatCard
            label="Receita total"
            value={formatPrice(stats.totalRevenue)}
            hint="Pedidos pagos e entregues"
            tone="success"
          />
        )}
      </AdminStatGrid>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
            Ações rápidas
          </p>
          <h2 className="mt-1 text-xl font-bold text-foreground">Continue de onde parou</h2>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/produtos/novo"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-5 py-3 font-semibold text-white hover:bg-accent-dark"
          >
            + Novo Produto
          </Link>
          <Link
            href="/admin/produtos/importar"
            className="inline-flex justify-center rounded-lg border border-border px-5 py-3 font-semibold text-foreground hover:bg-muted"
          >
            Importar Lista
          </Link>
          <Link
            href="/admin/categorias"
            className="inline-flex justify-center rounded-lg border border-border px-5 py-3 font-semibold text-foreground hover:bg-muted"
          >
            Categorias
          </Link>
          <Link
            href="/admin/marcas"
            className="inline-flex justify-center rounded-lg border border-border px-5 py-3 font-semibold text-foreground hover:bg-muted"
          >
            Marcas
          </Link>
        </div>
      </section>

      {user?.role !== 'OWNER' && (
        <p className="mt-4 text-xs text-muted-foreground">
          Indicadores financeiros ficam disponíveis somente para o proprietário.
        </p>
      )}
    </div>
  );
}
