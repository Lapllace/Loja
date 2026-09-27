'use client';

/**
 * Dashboard do Admin — apenas números que o backend realmente fornece hoje
 * (listagens existentes). Sem métricas financeiras inventadas.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type {
  AdminDelivery,
  AdminPayment,
  Brand,
  Category,
  Order,
  Product,
} from '@/lib/types';

interface Card {
  label: string;
  value: number | null;
  href: string;
  hint?: string;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [deliveries, setDeliveries] = useState<AdminDelivery[] | null>(null);
  const [usersCount, setUsersCount] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [brands, setBrands] = useState<Brand[] | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [productResult, orderResult, paymentResult, deliveryResult, userResult, categoryResult, brandResult] =
        await Promise.all([
          api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
          api.getOrders(),
          api.getPayments({ next: { revalidate: 0 } }),
          api.getDeliveries({ next: { revalidate: 0 } }),
          isOwner ? api.getUsers({ next: { revalidate: 0 } }) : Promise.resolve(null),
          api.getCategories({ next: { revalidate: 0 } }),
          api.getBrands({ next: { revalidate: 0 } }),
        ]);

      if (!active) return;
      setProducts(productResult);
      setOrders(orderResult.ok ? orderResult.data : null);
      setPayments(paymentResult.ok ? paymentResult.data : null);
      setDeliveries(deliveryResult.ok ? deliveryResult.data : null);
      setUsersCount(userResult && userResult.ok ? userResult.data.length : null);
      setCategories(categoryResult);
      setBrands(brandResult);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [isOwner]);

  const cards: Card[] = [
    {
      label: 'Produtos',
      value: products ? products.length : null,
      href: '/admin/produtos',
      hint: products ? `${products.filter((p) => p.stock === 0).length} sem estoque` : undefined,
    },
    { label: 'Categorias', value: categories ? categories.length : null, href: '/admin/categorias' },
    { label: 'Marcas', value: brands ? brands.length : null, href: '/admin/marcas' },
    { label: 'Pedidos', value: orders ? orders.length : null, href: '/admin/pedidos' },
    { label: 'Pagamentos', value: payments ? payments.length : null, href: '/admin/pagamentos' },
    { label: 'Entregas', value: deliveries ? deliveries.length : null, href: '/admin/entregas' },
    ...(isOwner ? [{ label: 'Usuários', value: usersCount, href: '/admin/usuarios' }] : []),
  ];

  if (loading) {
    return <LoadingState message="Carregando dashboard..." className="min-h-75" />;
  }

  const pendingDeliveries = deliveries?.filter((d) => d.status === 'QUOTED').length ?? 0;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
        Painel administrativo
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Visão geral da loja. Métricas avançadas serão adicionadas conforme o backend evoluir.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border-border bg-card p-5 transition-colors hover:border-accent/50"
          >
            <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {card.value === null ? '—' : card.value}
            </p>
            {card.hint && <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>}
          </Link>
        ))}
      </div>

      {pendingDeliveries > 0 && (
        <div className="mt-8 rounded-xl border-warning/40 bg-warning/10 p-5">
          <p className="font-semibold text-foreground">
            {pendingDeliveries} entrega(s) aguardando autorização
          </p>
          <Link href="/admin/entregas" className="mt-2 inline-flex text-sm font-medium text-accent hover:underline">
            Revisar entregas →
          </Link>
        </div>
      )}
    </div>
  );
}
