'use client';

/**
 * Tela de confirmação de pedido + pagamento via PIX.
 *
 * Fluxo:
 *  1. Lê o `orderId` da URL.
 *  2. Busca o pedido (GET /orders/:id) e o pagamento (POST /payments
 *     idempotente — devolve o existente quando já criado).
 *  3. Se o pedido já estiver PAGO, exibe mensagem de confirmação sem QR Code.
 *  4. Se o QR Code / Copia e Cola não vierem na resposta (PagBank indisponível),
 *     exibe aviso amigável com link para a página de pedidos.
 *  5. Expira o QR Code no timer quando `expiresAt` está presente.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Order, Payment } from '@/lib/types';
import { formatPrice, toNumber } from '@/lib/utils';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';

// ─── helpers ────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Ícone de check animado — apenas SVG, sem dep. externa. */
function CheckIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className="mx-auto"
    >
      <circle cx="24" cy="24" r="23" stroke="currentColor" strokeWidth="2" className="text-success" />
      <path
        d="M14 24l7 7 13-13"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success"
      />
    </svg>
  );
}

/** Ícone PIX simplificado (losango) */
function PixIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 2L18 10L10 18L2 10L10 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── step list ──────────────────────────────────────────────────────────────

const PIX_STEPS = [
  'Abra o aplicativo do seu banco ou carteira digital.',
  'Selecione a opção "PIX" e depois "Pagar com Copia e Cola".',
  'Cole o código copiado e confira o valor antes de confirmar.',
];

// ─── component ──────────────────────────────────────────────────────────────

type PageState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | {
      phase: 'pix';
      order: Order;
      payment: Payment;
    }
  | { phase: 'paid'; order: Order }
  | { phase: 'no_pix'; order: Order };

export default function CheckoutSuccessPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params?.orderId ?? '';

  const { isAuthenticated, loading: authLoading } = useAuth();

  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── load order + payment ──────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;

    let active = true;

    const fetchData = async () => {
      if (!isAuthenticated) {
        setState({ phase: 'error', message: 'Você precisa estar logado para ver esta página.' });
        return;
      }
      if (!orderId) {
        setState({ phase: 'error', message: 'Pedido não encontrado.' });
        return;
      }
      // 1. Busca o pedido
      const orderResult = await api.getOrderById(orderId);
      if (!active) return;

      if (!orderResult.ok) {
        setState({
          phase: 'error',
          message:
            orderResult.status === 404
              ? 'Pedido não encontrado.'
              : 'Não foi possível carregar os dados do pedido.',
        });
        return;
      }

      const order = orderResult.data;

      // 2. Pedido já pago → exibe tela de confirmação sem QR Code
      if (order.status === 'PAID' || order.status === 'DELIVERED') {
        setState({ phase: 'paid', order });
        return;
      }

      // 3. Busca / cria o pagamento (POST idempotente)
      const paymentResult = await api.createPayment(order.id, 'PIX');
      if (!active) return;

      if (!paymentResult.ok) {
        // Pedido criado mas pagamento indisponível — ainda mostramos a
        // tela de sucesso com orientação para usar /pedidos.
        setState({ phase: 'no_pix', order });
        return;
      }

      const payment = paymentResult.data;

      // 4. PIX sem QR Code (PagBank fora do ar, token ausente, etc.)
      if (!payment.pixCopyPaste && !payment.pixQrCode) {
        setState({ phase: 'no_pix', order });
        return;
      }

      setState({ phase: 'pix', order, payment });
    };

    void fetchData();
    return () => {
      active = false;
    };
  }, [authLoading, isAuthenticated, orderId]);

  // ── countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (state.phase !== 'pix') return;
    const { expiresAt } = state.payment;
    if (!expiresAt) return;

    const ms = new Date(expiresAt).getTime() - Date.now();
    const initial = Math.max(0, Math.floor(ms / 1000));
    const timeoutHandle = setTimeout(() => {
      setTimeLeft(initial);
    }, 0);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timeoutHandle);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // ── copy to clipboard ─────────────────────────────────────────────────────
  const handleCopy = async () => {
    if (state.phase !== 'pix' || !state.payment.pixCopyPaste) return;
    try {
      await navigator.clipboard.writeText(state.payment.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  // ── auth / loading guard ──────────────────────────────────────────────────
  if (authLoading || state.phase === 'loading') {
    return <LoadingState message="Carregando seu pedido…" className="min-h-[60vh]" />;
  }

  // ── error state ───────────────────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-error/30 bg-error/10 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Algo deu errado</h1>
          <p className="mt-3 text-muted-foreground">{state.message}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/pedidos"
              className="inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark"
            >
              Ver meus pedidos
            </Link>
            <Link
              href="/loja"
              className="inline-flex rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground hover:bg-muted"
            >
              Voltar para a loja
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ── already paid ─────────────────────────────────────────────────────────
  if (state.phase === 'paid') {
    const { order } = state;
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-success/30 bg-success/5 p-8 text-center">
          <CheckIcon />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-success">
            Pagamento confirmado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Pedido pago!</h1>
          <p className="mt-2 text-muted-foreground">
            Pedido <span className="font-semibold text-foreground">#{order.number}</span> já está
            pago e em processamento.
          </p>
          <dl className="mx-auto mt-6 max-w-xs space-y-2 rounded-xl bg-muted/40 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium">{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Frete{order.shippingOptionName ? ` (${order.shippingOptionName})` : ''}
              </dt>
              <dd className="font-medium">{formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>Total pago</dt>
              <dd className="text-accent">{formatPrice(order.total)}</dd>
            </div>
          </dl>
          <ActionButtons />
        </section>
      </main>
    );
  }

  // ── no PIX data available ─────────────────────────────────────────────────
  if (state.phase === 'no_pix') {
    const { order } = state;
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-warning/30 bg-warning/5 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-warning">
            Pedido criado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Pedido #{order.number} confirmado
          </h1>
          <p className="mt-3 text-muted-foreground">
            Seu pedido foi criado com sucesso! O QR Code PIX não pôde ser gerado agora — acesse a
            página <strong className="text-foreground">Meus Pedidos</strong> para concluir o
            pagamento quando o serviço estiver disponível.
          </p>
          <div className="mx-auto mt-6 flex justify-between rounded-xl bg-muted/40 p-4 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold text-foreground">{formatPrice(order.total)}</span>
          </div>
          <ActionButtons />
        </section>
      </main>
    );
  }

  // ── main PIX payment screen ───────────────────────────────────────────────
  const { order, payment } = state;
  const totalAmount = toNumber(payment.amount) ?? toNumber(order.total) ?? 0;
  const isExpired = timeLeft !== null && timeLeft <= 0;

  return (
    <main className="container-custom py-8 md:py-12">
      {/* breadcrumb */}
      <nav aria-label="Você está aqui" className="mb-6 text-sm text-muted-foreground">
        <Link href="/loja" className="hover:text-accent">
          Início
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-foreground">Confirmar pagamento</span>
      </nav>

      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── header card ─────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-success/30 bg-success/5 p-6 text-center">
          <CheckIcon />
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.16em] text-success">
            Pedido confirmado
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            Pedido #{order.number}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Finalize o pagamento via PIX para processarmos seu pedido.
          </p>
        </section>

        {/* ── order summary ────────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-input bg-card p-5">
          <h2 className="text-base font-semibold text-foreground">Resumo do pedido</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Frete{order.shippingOptionName ? ` — ${order.shippingOptionName}` : ''}
              </dt>
              <dd>{formatPrice(order.shipping)}</dd>
            </div>
            {toNumber(order.discount) !== null && toNumber(order.discount)! > 0 && (
              <div className="flex justify-between text-success">
                <dt>Desconto</dt>
                <dd>− {formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold">
              <dt>Total a pagar</dt>
              <dd className="text-accent">{formatPrice(totalAmount)}</dd>
            </div>
          </dl>
        </section>

        {/* ── PIX block ─────────────────────────────────────────────────────── */}
        <section
          aria-label="Pagamento PIX"
          className="rounded-2xl border border-input bg-card p-5 md:p-7"
        >
          <div className="mb-5 flex items-center gap-2">
            <PixIcon />
            <h2 className="text-lg font-bold text-foreground">Pague com PIX</h2>
          </div>

          {/* value highlight */}
          <div className="mb-6 rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Valor a pagar
            </p>
            <p className="mt-1 text-3xl font-bold text-accent">{formatPrice(totalAmount)}</p>
          </div>

          {/* expired notice */}
          {isExpired && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-center text-sm text-error"
            >
              Este QR Code expirou.{' '}
              <Link href="/pedidos" className="font-semibold underline hover:opacity-80">
                Acesse Meus Pedidos
              </Link>{' '}
              para gerar um novo.
            </div>
          )}

          {/* QR Code */}
          {payment.pixQrCode && !isExpired && (
            <div className="mb-5 flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-foreground">
                Escaneie o QR Code com o app do seu banco
              </p>
              <div className="rounded-xl border border-border bg-white p-3 shadow-sm">
                <Image
                  src={payment.pixQrCode}
                  alt="QR Code PIX"
                  width={200}
                  height={200}
                  className="h-[200px] w-[200px] object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Copy & paste */}
          {payment.pixCopyPaste && !isExpired && (
            <div className="mb-5 rounded-xl border border-border bg-background p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                PIX Copia e Cola
              </p>
              <p className="mb-3 break-all rounded-lg bg-muted/50 px-3 py-2 text-xs text-foreground">
                {payment.pixCopyPaste}
              </p>
              <Button
                type="button"
                variant={copied ? 'secondary' : 'primary'}
                size="md"
                className="w-full"
                onClick={() => void handleCopy()}
                aria-live="polite"
              >
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M3 8l3.5 3.5L13 4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Código copiado!
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M5 5V3a1 1 0 011-1h7a1 1 0 011 1v7a1 1 0 01-1 1h-2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    Copiar código PIX
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Countdown */}
          {timeLeft !== null && !isExpired && (
            <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" className="text-warning" />
                <path
                  d="M8 4.5v3.75l2.25 2.25"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-warning"
                />
              </svg>
              <p className="text-sm font-semibold text-warning">
                Expira em {formatCountdown(timeLeft)}
              </p>
            </div>
          )}

          {/* Step-by-step instructions */}
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">Como pagar:</p>
            <ol className="space-y-2.5">
              {PIX_STEPS.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── action buttons ────────────────────────────────────────────────── */}
        <ActionButtons />
      </div>
    </main>
  );
}

/** Botões de ação reutilizados nos diferentes estados da página. */
function ActionButtons() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
      <Link
        href="/pedidos"
        className="inline-flex items-center justify-center rounded-lg bg-accent px-6 py-3 font-semibold text-ink transition hover:bg-accent-dark"
      >
        Ver meus pedidos
      </Link>
      <Link
        href="/loja"
        className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-6 py-3 font-semibold text-foreground transition hover:bg-muted"
      >
        Voltar para a loja
      </Link>
    </div>
  );
}
