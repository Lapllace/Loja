'use client';

/**
 * Vendas → Entregas.
 *
 * Backend auditado (delivery.controller.ts):
 *  - GET /deliveries (ADMIN/OWNER vê todas);
 *  - GET /deliveries/pending-authorization (ADMIN/OWNER) — cotadas + pagas;
 *  - POST /deliveries/:id/authorize (ADMIN/OWNER) — exige pagamento confirmado
 *    e status QUOTED; o próprio backend valida.
 *  - DELETE bloqueado (registro histórico).
 *
 * Não integramos nada novo de Uber/99 — authorize chama o fluxo existente.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { AdminDelivery, PendingDeliveryAuthorization } from '@/lib/types';

const METHOD_LABELS: Record<string, string> = {
  PICKUP: 'Retirada',
  UBER: 'Uber',
  NINENINE: '99',
  MANUAL: 'Manual',
};

export default function AdminDeliveriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [deliveries, setDeliveries] = useState<AdminDelivery[] | null>(null);
  const [pending, setPending] = useState<PendingDeliveryAuthorization[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [deliveryResult, pendingResult] = await Promise.all([
      api.getDeliveries({ next: { revalidate: 0 } }),
      api.getPendingDeliveryAuthorizations({ next: { revalidate: 0 } }),
    ]);
    if (deliveryResult.ok) setDeliveries(deliveryResult.data);
    else setError('Não foi possível carregar as entregas.');
    if (pendingResult.ok) setPending(pendingResult.data);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void (async () => {
      const [deliveryResult, pendingResult] = await Promise.all([
        api.getDeliveries({ next: { revalidate: 0 } }),
        api.getPendingDeliveryAuthorizations({ next: { revalidate: 0 } }),
      ]);
      if (!active) return;
      if (deliveryResult.ok) setDeliveries(deliveryResult.data);
      else setError('Não foi possível carregar as entregas.');
      if (pendingResult.ok) setPending(pendingResult.data);
    })();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleAuthorize = async (deliveryId: string) => {
    setBusyId(deliveryId);
    setError(null);
    const result = await api.authorizeDelivery(deliveryId);
    setBusyId(null);
    if (!result.ok) {
      setError(
        result.status === 400
          ? 'O backend recusou a autorização (pagamento não confirmado ou entrega fora do status QUOTED).'
          : 'Não foi possível autorizar a entrega.',
      );
      return;
    }
    setNotice('Entrega autorizada.');
    void load();
  };

  const [notice, setNotice] = useState<string | null>(null);

  if (!isAdmin) return null;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Vendas</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Entregas</h1>
      <p className="mt-2 text-muted-foreground">
        Acompanhe entregas e autorize envios por aplicativo quando permitido.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-lg border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">Aguardando autorização</h2>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma entrega pendente de autorização.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {pending.map((item) => (
              <li
                key={item.deliveryId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-border bg-card p-4"
              >
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Pedido {item.orderNumber ?? item.orderId}
                  </p>
                  <p className="text-muted-foreground">
                    {item.destination?.recipient ?? '—'} · {item.destination?.city ?? '—'}/
                    {item.destination?.state ?? '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAuthorize(item.deliveryId)}
                  disabled={busyId === item.deliveryId}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
                >
                  {busyId === item.deliveryId ? 'Autorizando...' : 'Autorizar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-foreground">Todas as entregas</h2>
        <div className="mt-3">
          {deliveries === null ? (
            <LoadingState message="Carregando entregas..." className="min-h-[200px]" />
          ) : deliveries.length === 0 ? (
            <div className="rounded-xl border-border bg-muted/30 p-8 text-center text-muted-foreground">
              Nenhuma entrega registrada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Pedido</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Método</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Rastreio</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((delivery) => (
                    <tr key={delivery.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {delivery.order?.number ?? delivery.orderId}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {METHOD_LABELS[delivery.method] ?? delivery.method}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{delivery.status}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {delivery.trackingCode ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
