import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meu carrinho',
  description: 'Revise os itens do seu carrinho e finalize sua compra na Gil Imports.',
  alternates: { canonical: '/loja/carrinho' },
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
