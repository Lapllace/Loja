'use client';

import Link from 'next/link';
import { CartItem } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { CartItemRow } from './CartItem';

interface CartListProps {
  items: CartItem[];
  loading: boolean;
  error: string | null;
  updating: boolean;
  onUpdate: (item: CartItem, quantity: number) => void | Promise<void>;
  onRemove: (item: CartItem) => void | Promise<void>;
  /** Visitantes também veem a lista; apenas o checkout exige conta. */
  isAuthenticated: boolean;
  /** Nova tentativa do GET /cart quando o carregamento falha. */
  onRetry: () => void;
}

export function CartList({
  items,
  loading,
  error,
  updating,
  onUpdate,
  onRemove,
  isAuthenticated,
  onRetry,
}: CartListProps) {
  if (loading) {
    return <LoadingState message="Carregando seu carrinho..." />;
  }

  if (error) {
    return (
      <EmptyState
        title="Não foi carregar o carrinho"
        description={error}
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        }
        action={
          <button
            onClick={onRetry}
            className="mt-2 inline-flex items-center px-5 py-2.5 rounded-lg bg-accent text-ink font-semibold hover:bg-accent-dark"
          >
            Tentar novamente
          </button>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Navegue pela loja e adicione os produtos que deseja."
        icon={
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.013 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        }
        action={
          <Link
            href="/loja/produtos"
            className="mt-2 inline-flex items-center px-5 py-2.5 rounded-lg bg-accent text-ink font-semibold hover:bg-accent-dark"
          >
            Explorar produtos
          </Link>
        }
      />
    );
  }

  return (
    <div>
      {!isAuthenticated && (
        <p className="mb-4 rounded-lg border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
          Você está comprando como visitante: os itens ficam salvos neste dispositivo.{' '}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Entre na conta
          </Link>{' '}
          para finalizar a compra.
        </p>
      )}
      <ul className="divide-y divide-border">
        {items.map((item) => (
          <CartItemRow
            key={item.id ?? item.productId}
            item={item}
            updating={updating}
            onChange={(q) => void onUpdate(item, q)}
            onRemove={() => void onRemove(item)}
          />
        ))}
      </ul>
    </div>
  );
}
