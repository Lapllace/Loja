'use client';

/**
 * Vendas → Pagamentos. VISUALIZAÇÃO APENAS.
 *
 * Auditoria do backend:
 *  - GET /payments (ADMIN/OWNER) retorna todos com order incluído;
 *  - PATCH /payments/:id existe mas altera `status` — não expomos isso no
 *    Admin para não permitir manipulação financeira arbitrária;
 *  - DELETE é bloqueado (registro histórico).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { AdminPayment } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Falhou',
  REFUNDED: 'Reembolsado',
};

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'bg-warning/10 text-warning',
  PAID: 'bg-success/10 text-success',
  FAILED: 'bg-error/10 text-error',
  REFUNDED: 'bg-error/10 text-error',
};

const METHOD_LABELS: Record<string, string> = {
  PIX: 'Pix',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  BOLETO: 'Boleto',
  CASH: 'Dinheiro',
};

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [payments, setPayments] = useState<AdminPayment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void api.getPayments({ next: { revalidate: 0 } }).then((result) => {
      if (!active) return;
      if (result.ok) setPayments(result.data);
      else setError('Não foi possível carregar os pagamentos.');
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Vendas</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Pagamentos</h1>
      <p className="mt-2 text-muted-foreground">
        Consulta dos pagamentos. Alterações de status financeiro acontecem por webhook do provedor.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      <div className="mt-6">
        {payments === null ? (
          <LoadingState message="Carregando pagamentos..." className="min-h-[200px]" />
        ) : payments.length === 0 ? (
          <div className="rounded-xl border-border bg-muted/30 p-8 text-center text-muted-foreground">
            Nenhum pagamento registrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Pedido</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Método</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Valor</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Pago em</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {payment.order?.number ?? payment.orderId}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {METHOD_LABELS[payment.method] ?? payment.method}
                    </td>
                    <td className="px-4 py-3 text-foreground">R$ {Number(payment.amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASSES[payment.status] ?? 'bg-muted text-muted-foreground'
                          }`}
                      >
                        {STATUS_LABELS[payment.status] ?? payment.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
