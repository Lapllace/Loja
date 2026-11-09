'use client';

import Link from 'next/link';
import { CartItem } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
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

function CartIcon() {
  return (
    <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.013 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
      />
    </svg>
  );
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
        title="Não foi possível carregar o carrinho"
        description={error}
        icon={
          <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        }
        action={
          <Button onClick={onRetry} variant="primary" size="md">
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Seu carrinho está vazio"
        description="Navegue pela loja e adicione os produtos que deseja."
        icon={<CartIcon />}
        action={
          <Link
            href="/loja/produtos"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark"
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
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <svg className="mt-0.5 size-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a7.5 7.5 0 0115 0v.75H4.5v-.75z" />
          </svg>
          <span>
            Você está comprando como visitante: os itens ficam salvos neste dispositivo.{' '}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Entre na conta
            </Link>{' '}
            para finalizar a compra.
          </span>
        </div>
      )}

      <ul>
        {items.map((item) => (
          <CartItemRow
            key={item.id ?? item.productId}
            item={item}
            updating={updating}
            onChange={(quantity) => void onUpdate(item, quantity)}
            onRemove={() => void onRemove(item)}
          />
        ))}
      </ul>
    </div>
  );
}
