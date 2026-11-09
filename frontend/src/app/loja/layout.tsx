import { StorefrontShell } from '@/components/layout/StorefrontShell';

// Layout da vitrine: categorias são buscadas uma única vez no shell (5 min).
export const revalidate = 300;

export default function LojaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
