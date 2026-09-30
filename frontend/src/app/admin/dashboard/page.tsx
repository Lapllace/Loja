'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Order } from '@/lib/types';

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

  useEffect(() => {
    if (!isAdmin) return;

    const loadStats = async () => {
      try {
        const [products, ordersResult, usersResult] = await Promise.all([
          api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
          api.getOrders(),
          api.getUsers({ next: { revalidate: 0 } }),
        ]);

        const activeProducts = products.filter((p) => p.active).length;

        const orderList: Order[] = ordersResult.ok ? ordersResult.data : [];
        const userCount = usersResult.ok ? usersResult.data.length : 0;

        const pendingOrders = orderList.filter((o) => o.status === 'PENDING').length;
        const totalRevenue = orderList
          .filter((o) => o.status === 'PAID' || o.status === 'DELIVERED')
          .reduce((sum, order) => sum + Number(order.total), 0);

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
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isAdmin]);

  if (!isAdmin) return null;

  if (loading) {
    return <LoadingState message="Carregando dashboard..." className="min-h-[400px]" />;
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Painel Administrativo</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Visão geral da loja</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/produtos"
          className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/60 transition"
        >
          <p className="text-sm font-medium text-muted-foreground">Produtos</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalProducts}</p>
          <p className="mt-1 text-sm text-success">{stats.activeProducts} ativos</p>
        </Link>

        <Link
          href="/admin/pedidos"
          className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/60 transition"
        >
          <p className="text-sm font-medium text-muted-foreground">Pedidos</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalOrders}</p>
          <p className="mt-1 text-sm text-warning">{stats.pendingOrders} pendentes</p>
        </Link>

        <Link
          href="/admin/usuarios"
          className="rounded-xl border border-border bg-card p-6 shadow-sm hover:border-accent/60 transition"
        >
          <p className="text-sm font-medium text-muted-foreground">Usuários</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalUsers}</p>
        </Link>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-3">
          <p className="text-sm font-medium text-muted-foreground">Receita Total</p>
          <p className="mt-2 text-3xl font-bold text-foreground">
            R$ {stats.totalRevenue.toFixed(2)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Pedidos pagos e entregues</p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/produtos/novo"
          className="inline-flex justify-center rounded-lg bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent-dark"
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
    </div>
  );
}
