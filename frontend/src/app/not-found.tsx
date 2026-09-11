import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <p className="text-accent text-6xl font-bold mb-4">404</p>
      <h1 className="text-2xl font-bold text-foreground mb-2">Página não encontrada</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        A página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/loja"
        className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-ink font-semibold hover:bg-accent-dark transition-colors"
      >
        Voltar para a loja
      </Link>
    </div>
  );
}
