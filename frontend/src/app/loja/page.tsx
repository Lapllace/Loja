import type { Metadata } from 'next';
import { StorefrontHome } from '@/components/sections/StorefrontHome';

export const metadata: Metadata = {
  title: 'Início',
  description:
    'Acessórios para celular, fones, caixas de som, smartwatches, garrafas térmicas e perfumes árabes importados.',
  alternates: { canonical: '/' },
};

// Home da vitrine (Server Component) — revalida a cada 60s.
export const revalidate = 60;

export default function LojaHomePage() {
  return <StorefrontHome />;
}
