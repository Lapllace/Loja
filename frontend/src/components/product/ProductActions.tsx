'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { isInStock } from '@/lib/utils';

/**
 * Ações da página de produto.
 * Carrinho/favoritos/compartilhamento são placeholders visuais —
 * as funcionalidades chegam em etapas futuras.
 */
export function ProductActions({ stock }: { stock: number }) {
  const inStock = isInStock(stock);

  const handleShare = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: document.title, url: window.location.href });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
      }
    } catch {
      // usuário cancelou ou clipboard indisponível — ignorar silenciosamente
    }
  };

  return (
    <div className="space-y-4 pt-6 border-t border-border">
      <Button variant="primary" size="lg" className="w-full" disabled={!inStock} title="Carrinho em breve">
        {inStock ? 'Adicionar ao carrinho' : 'Produto esgotado'}
      </Button>

      <Button variant="outline" size="lg" className="w-full" onClick={handleShare}>
        Compartilhar
      </Button>
    </div>
  );
}
