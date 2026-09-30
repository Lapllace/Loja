'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import {
  ImageSearchDialog,
  IMAGE_SEARCH_MAX_SELECTION,
} from '@/components/admin/ImageSearchDialog';
import { api } from '@/lib/api';
import type { SelectedImageCandidate } from '@/lib/types';

/**
 * Ferramenta AVANÇADA de busca de imagens (exclusiva do OWNER).
 *
 * Não é mais o caminho principal para cadastrar imagens — o fluxo normal é o
 * botão "Buscar imagem na internet" na seção "Foto do produto" do cadastro.
 *
 * Esta página reutiliza o MESMO `ImageSearchDialog` (nenhuma lógica paralela):
 * a busca NÃO exige Product ID. O Product ID só é necessário no passo de
 * importação, para associar as imagens a um produto que já existe.
 */
export default function DeveloperImagesPage() {
  const router = useRouter();
  const { isAuthenticated, loading, user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [selected, setSelected] = useState<SelectedImageCandidate[]>([]);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  if (loading) {
    return <LoadingState message="Verificando permissões..." className="min-h-125" />;
  }

  if (!isAuthenticated || !isOwner) {
    router.replace('/admin/dashboard');
    return null;
  }

  async function importSelected() {
    if (!productId.trim()) {
      setMessage('Informe o ID do produto para associar as imagens.');
      setMessageType('error');
      return;
    }
    if (selected.length === 0) {
      setMessage('Selecione pelo menos uma imagem.');
      setMessageType('error');
      return;
    }

    setImporting(true);
    setMessage('Baixando imagens selecionadas...');

    const result = await api.importSelectedImages({
      productId: productId.trim(),
      images: selected.map((img) => ({
        id: img.id,
        title: img.title,
        source: img.source,
        sourceUrl: img.sourceUrl,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        query: img.query,
      })),
    });

    setImporting(false);

    if (!result.ok) {
      setMessage(
        result.status === 403
          ? 'Acesso negado. Apenas OWNERS podem usar esta ferramenta.'
          : result.status === 401
            ? 'Sessão expirada. Faça login novamente.'
            : result.status === 404
              ? 'Produto não encontrado.'
              : 'Falha ao importar as imagens.',
      );
      setMessageType('error');
      return;
    }

    setMessage(`${result.data.images.length} imagem(ns) associada(s) ao produto.`);
    setMessageType('success');
    setSelected([]);
  }

  return (
    <main className="container-custom py-8 md:py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Desenvolvedor
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Busca de Imagens</h1>
        <p className="mt-2 text-muted-foreground">
          Ferramenta avançada para associar imagens a um produto já existente. No dia a dia,
          use o botão &ldquo;Buscar imagem na internet&rdquo; dentro do cadastro de produto.
        </p>
      </div>

      <div className="space-y-6">
        {/* Passo 1 — buscar (não exige Product ID) */}
        <div className="rounded-lg border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">1. Buscar imagens</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A busca usa apenas o termo informado — não é necessário cadastrar o produto antes.
          </p>
          <Button type="button" className="mt-4" onClick={() => setDialogOpen(true)}>
            🔎 Buscar imagens na internet
          </Button>
        </div>

        {/* Passo 2 — associar a um produto existente */}
        <div className="rounded-lg border-border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-foreground">2. Associar a um produto</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            O ID do produto é necessário apenas aqui, para gravar as imagens selecionadas.
          </p>

          <div className="mt-4">
            <label htmlFor="productId" className="mb-1 block text-sm font-medium text-foreground">
              ID do Produto
            </label>
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="ID do produto no banco"
            />
          </div>

          {selected.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-foreground">
                Selecionadas ({selected.length}/{IMAGE_SEARCH_MAX_SELECTION})
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {selected.map((img) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-lg border-border bg-background"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumbnailUrl || img.imageUrl}
                      alt={img.title || 'Imagem selecionada'}
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      aria-label="Remover imagem"
                      onClick={() =>
                        setSelected((current) => current.filter((item) => item.id !== img.id))
                      }
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            type="button"
            className="mt-5"
            disabled={importing || selected.length === 0 || !productId.trim()}
            onClick={() => void importSelected()}
          >
            {importing ? 'Importando...' : `Importar selecionadas (${selected.length})`}
          </Button>
        </div>

        {message && (
          <div
            role={messageType === 'error' ? 'alert' : 'status'}
            className={`rounded-lg px-4 py-3 ${
              messageType === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Mesmo componente usado no cadastro de produto — sem lógica duplicada.
          A `key` remonta o diálogo a cada abertura para resetar a seleção. */}
      <ImageSearchDialog
        key={dialogOpen ? 'dev-search-open' : 'dev-search-closed'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        initialQuery=""
        initiallySelected={selected}
        onConfirm={setSelected}
      />
    </main>
  );
}
