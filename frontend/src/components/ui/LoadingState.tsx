import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Carregando...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="size-12 animate-spin rounded-full border-b-2 border-accent" aria-hidden="true" />
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse overflow-hidden rounded-2xl border border-border/80 bg-card ${className}`}>
      <div className="aspect-square bg-muted" />
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-20 rounded-full bg-muted" />
        <div className="h-4 w-4/5 rounded bg-muted" />
        <div className="h-4 w-1/2 rounded bg-muted" />
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="h-10 w-full rounded-xl bg-muted" />
      </div>
    </div>
  );
}
