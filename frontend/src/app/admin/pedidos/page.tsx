'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/ui/LoadingState';
import { api } from '@/lib/api';
import type { Order } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  PROCESSING: 'Preparando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-10 text-yellow',
  PAID: 'bg-green-10 text-green',
  PROCESSING: 'bg-blue-10 text-blue',
  SHIPPED: 'bg-purple-10 text-purple',
  DELIVERED: 'bg-success/10 text-success',
  CANCELLED: 'bg-error/10 text-error',
  REFUNDED: 'bg-error/10 text-error',
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!isAdmin) router.replace('/');
  }, [isAdmin, isAuthenticated, loading, router]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) return;

    const loadOrders = async () => {
      const result = await api.getOrders();
      if (result.ok) {
        setOrders(result.data);
      }
      setLoadingOrders(false);
    };

    loadOrders();
  }, [isAuthenticated, isAdmin]);

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    setError(null);
    setSuccess(null);

    const result = await api.updateOrderStatus(selectedOrder.id, { status: newStatus });
    setUpdating(false);

    if (!result.ok) {
      setError('Não foi possível atualizar o status do pedido.');
      return;
    }

    setSuccess('Status atualizado com sucesso!');
    setSelectedOrder(null);
    setNewStatus('');

    // Recarregar pedidos
    const ordersResult = await api.getOrders();
    if (ordersResult.ok) {
      setOrders(ordersResult.data);
    }
  };

  if (loading) {
    return <LoadingState message="Verificando permissões..." className="min-h-[500px]" />;
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <main className="container-custom py-8 md:py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
        Painel administrativo
      </p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Pedidos</h1>
      <p className="mt-2 text-muted-foreground">
        Gerencie os pedidos recebidos na loja.
      </p>

      {error && (
        <div role="alert" className="mt-6 rounded-xl border-error/30 bg-error/10 px-4 py-3 text-error">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="mt-6 rounded-xl border-success/30 bg-success/10 px-4 py-3 text-success">
          {success}
        </div>
      )}

      <div className="mt-8">
        {loadingOrders ? (
          <LoadingState message="Carregando pedidos..." className="min-h-[200px]" />
        ) : orders.length === 0 ? (
          <div className="rounded-xl border-border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Nº</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Data</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-border">
                    <td className="px-4 py-3 text-foreground font-medium">#{order.number}</td>
                    <td className="px-4 py-3 text-foreground">Cliente</td>
                    <td className="px-4 py-3 text-foreground">
                      {typeof order.total === 'string' ? order.total : `R$ ${Number(order.total).toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_COLORS[order.status] || 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalhes/status */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="my-8 w-full max-w-2xl rounded-2xl border-border bg-background shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-border p-5">
              <div>
                <h2 className="text-xl font-bold text-foreground">Pedido #{selectedOrder.number}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Itens do pedido</h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-foreground">
                        {item.productName} x {item.quantity}
                      </span>
                      <span className="text-muted-foreground">
                        {typeof item.totalPrice === 'string'
                          ? item.totalPrice
                          : `R$ ${Number(item.totalPrice).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Subtotal</h3>
                  <p className="text-muted-foreground">
                    {typeof selectedOrder.subtotal === 'string'
                      ? selectedOrder.subtotal
                      : `R$ ${Number(selectedOrder.subtotal).toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Frete</h3>
                  <p className="text-muted-foreground">
                    {typeof selectedOrder.shipping === 'string'
                      ? selectedOrder.shipping
                      : `R$ ${Number(selectedOrder.shipping).toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Desconto</h3>
                  <p className="text-muted-foreground">
                    {typeof selectedOrder.discount === 'string'
                      ? selectedOrder.discount
                      : `R$ ${Number(selectedOrder.discount).toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Total</h3>
                  <p className="text-foreground font-semibold">
                    {typeof selectedOrder.total === 'string'
                      ? selectedOrder.total
                      : `R$ ${Number(selectedOrder.total).toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Endereço de entrega</h3>
                {selectedOrder.address ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.address.recipient}
                    <br />
                    {selectedOrder.address.street}, {selectedOrder.address.number}
                    {selectedOrder.address.complement && ` - ${selectedOrder.address.complement}`}
                    <br />
                    {selectedOrder.address.district}
                    <br />
                    {selectedOrder.address.city} - {selectedOrder.address.state}
                    <br />
                    CEP: {selectedOrder.address.zipcode}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Endereço não disponível</p>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Alterar status</h3>
                <div className="flex gap-3">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    <option value="">Selecione...</option>
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="PROCESSING">Preparando</option>
                    <option value="SHIPPED">Enviado</option>
                    <option value="DELIVERED">Entregue</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || updating}
                    className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-50"
                  >
                    {updating ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
