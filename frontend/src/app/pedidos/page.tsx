'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Order, Payment } from '@/lib/types';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { resolveImageUrl } from '@/lib/api';

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pendente', className: 'bg-warning/10 text-warning border-warning/30' },
    AWAITING_PAYMENT: { label: 'Aguardando Pagamento', className: 'bg-warning/10 text-warning border-warning/30' },
    PAID: { label: 'Pago', className: 'bg-success/10 text-success border-success/30' },
    PROCESSING: { label: 'Processando', className: 'bg-info/10 text-info border-info/30' },
    SHIPPED: { label: 'Enviado', className: 'bg-accent/10 text-accent border-accent/30' },
    DELIVERED: { label: 'Entregue', className: 'bg-success/10 text-success border-success/30' },
    CANCELLED: { label: 'Cancelado', className: 'bg-error/10 text-error border-error/30' },
    REFUNDED: { label: 'Reembolsado', className: 'bg-muted/10 text-muted-foreground border-muted/30' },
  };

  const { label, className } = statusMap[status] || { label: status, className: 'bg-muted/10 text-muted-foreground border-muted/30' };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function OrderCard({ order }: { order: Order }) {
  const [showPixModal, setShowPixModal] = useState(false);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isPending = order.status === 'PENDING' || order.status === 'AWAITING_PAYMENT';

  useEffect(() => {
    if (!showPixModal || !isPending) return;

    let active = true;
    let timer: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const fetchPayment = async () => {
      const result = await api.createPayment(order.id, 'PIX');
      if (!active) return;

      if (result.ok) {
        setPayment(result.data);
        if (result.data.expiresAt) {
          const expiresAt = new Date(result.data.expiresAt).getTime();
          const now = Date.now();
          const initialTimeLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));

          timer = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev === null || prev <= 1) {
                if (timer) clearInterval(timer);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          timeout = setTimeout(() => {
            setTimeLeft(initialTimeLeft);
          }, 0);
        }
      }
      setLoadingPayment(false);
    };

    fetchPayment();

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      if (timeout) clearTimeout(timeout);
    };
  }, [showPixModal, order.id, isPending]);

  const handleCopyPixKey = async () => {
    if (payment?.pixCopyPaste) {
      try {
        await navigator.clipboard.writeText(payment.pixCopyPaste);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-border bg-background p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-foreground">Pedido #{order.number}</h3>
              {getStatusBadge(order.status)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Realizado em {formatDate(order.createdAt)}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground">
              <PriceFormatter price={order.total} />
            </p>
          </div>
        </div>

        {order.items && order.items.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {order.items.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.productImage && (
                  <Image
                    src={resolveImageUrl(item.productImage) || ''}
                    alt={item.productName}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover border border-border"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-foreground">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x <PriceFormatter price={item.unitPrice} />
                  </p>
                </div>
              </div>
            ))}
            {order.items.length > 3 && (
              <p className="text-sm text-muted-foreground">
                +{order.items.length - 3} outros itens
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPixModal(true)}
            disabled={!isPending}
          >
            {isPending ? 'Pagar com PIX' : 'Ver detalhes'}
          </Button>
        </div>
      </div>

      {showPixModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-md w-full rounded-2xl border border-border bg-background p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Pagamento PIX</h3>
              <button
                onClick={() => setShowPixModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            {loadingPayment ? (
              <LoadingState message="Carregando dados do pagamento..." />
            ) : payment ? (
              <div className="space-y-4">
                {payment.pixQrCode && (
                  <div className="flex justify-center">
                    <Image
                      src={payment.pixQrCode}
                      alt="QR Code PIX"
                      width={192}
                      height={192}
                      className="h-48 w-48 rounded-lg border border-border bg-white"
                    />
                  </div>
                )}
                {payment.pixCopyPaste && (
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="text-sm font-semibold text-foreground mb-2">PIX copia e cola</p>
                    <p className="break-all text-xs text-muted-foreground mb-3">{payment.pixCopyPaste}</p>
                    <button
                      type="button"
                      onClick={handleCopyPixKey}
                      className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink transition hover:bg-accent-dark"
                    >
                      {copied ? 'Chave Copiada!' : 'Copiar Chave PIX'}
                    </button>
                  </div>
                )}
                {timeLeft !== null && (
                  <div className="rounded-lg border border-warning/30 bg-warning/10 px-4 py-3">
                    <p className="text-sm font-semibold text-warning">
                      {timeLeft > 0
                        ? `Este QR Code expira em ${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')}`
                        : 'Este QR Code expirou'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">
                Não foi possível carregar os dados do pagamento.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;
    let timer: NodeJS.Timeout | null = null;
    let errorTimer: NodeJS.Timeout | null = null;

    const fetchOrders = async () => {
      timer = setTimeout(() => {
        if (active) setLoading(true);
      }, 0);

      errorTimer = setTimeout(() => {
        if (active) setError(null);
      }, 0);

      try {
        const result = await api.getOrders();
        if (!active) return;

        if (result.ok) {
          setOrders(result.data);
        } else {
          setError('Não foi possível carregar seus pedidos.');
        }
      } catch {
        if (active) setError('Erro ao carregar pedidos.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchOrders();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (errorTimer) clearTimeout(errorTimer);
    };
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return <LoadingState message="Carregando seus pedidos..." className="min-h-[500px]" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Entre para ver seus pedidos</h1>
          <p className="mt-3 text-muted-foreground">Você precisa estar logado para acessar seus pedidos.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark">
            Entrar na conta
          </Link>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-error/30 bg-error/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-error">Erro ao carregar pedidos</h1>
          <p className="mt-3 text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-6">
            Tentar novamente
          </Button>
        </section>
      </main>
    );
  }

  if (orders.length === 0) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Você ainda não tem pedidos</h1>
          <p className="mt-3 text-muted-foreground">Comece a explorar nossa loja e faça sua primeira compra!</p>
          <Link href="/loja" className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark">
            Explorar produtos
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container-custom py-8 md:py-12">
      <nav aria-label="Você está aqui" className="mb-4 text-sm text-muted-foreground">
        <Link href="/loja" className="hover:text-accent">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="font-medium text-foreground">Meus Pedidos</span>
      </nav>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Minha Conta</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Meus Pedidos</h1>
      </div>

      <div className="space-y-4">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>
    </main>
  );
}
