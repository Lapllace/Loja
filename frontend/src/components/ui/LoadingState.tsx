import React from 'react';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Carregando...', className = '' }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-muted-foreground">{message}</p>
    </div>
  );
}

export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-muted h-48 rounded-lg mb-4"></div>
      <div className="bg-muted h-4 rounded w-3/4 mb-2"></div>
      <div className="bg-muted h-4 rounded w-1/2 mb-2"></div>
      <div className="bg-muted h-6 rounded w-1/3"></div>
    </div>
  );
}
