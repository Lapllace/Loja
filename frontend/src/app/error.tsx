'use client';

import React from 'react';

/**
 * Error boundary global — captura erros não tratados em qualquer rota.
 * Exibe mensagem amigável sem quebrar a interface.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
      <svg className="w-14 h-14 text-error mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <h1 className="text-2xl font-bold text-foreground mb-2">Algo deu errado</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Ocorreu um erro inesperado ao renderizar esta página.
        {error.digest && (
          <span className="block mt-1 text-xs text-muted-foreground">
            Código do erro: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-6 py-3 rounded-lg bg-accent text-ink font-semibold hover:bg-accent-dark transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
