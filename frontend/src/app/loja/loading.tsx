import { LoadingState } from '@/components/ui/LoadingState';

// Fallback de carregamento da vitrine (Server Component)
export default function LojaLoading() {
  return (
    <div className="py-24">
      <LoadingState message="Carregando..." />
    </div>
  );
}
