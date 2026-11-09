import type { Metadata } from 'next';
import { StorefrontShell } from '@/components/layout/StorefrontShell';
import { StorefrontHome } from '@/components/sections/StorefrontHome';

export const metadata: Metadata = {
  description:
    'Acessórios para celular, fones, caixas de som, smartwatches, garrafas térmicas e perfumes árabes importados.',
  alternates: { canonical: '/' },
};

// A raiz também entrega a home da vitrine; /loja continua disponível.
export const revalidate = 60;

export default function Home() {
  return (
    <StorefrontShell>
      <StorefrontHome />
    </StorefrontShell>
  );
}
