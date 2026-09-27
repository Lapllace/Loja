'use client';

import { useState } from 'react';

type ProductForm = {
  productId?: string;
  name: string;
  brand?: string;
  model?: string;
  volume?: string;
  variant?: string;
  category?: string;
};

type Candidate = {
  id: string;
  title: string;
  source: string;
  sourceUrl: string;
  thumbnailUrl?: string;
  imageUrl: string;
  width?: number;
  height?: number;
  score: number;
  query: string;
};

type Props = {
  apiUrl: string;
  token: string;
};

export function ImageSearchPanel({ apiUrl, token }: Props) {
  const [product, setProduct] = useState<ProductForm>({ name: '' });
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function search() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${apiUrl}/developer/image-search/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify(product),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Falha na busca.');
      const data = await response.json();
      setCandidates(data.candidates ?? []);
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha inesperada.');
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      return next;
    });
  }

  async function downloadSelected() {
    const images = candidates.filter((candidate) => selected.has(candidate.id));
    if (!images.length) return;
    setLoading(true);
    setMessage('Baixando imagens selecionadas...');
    try {
      const response = await fetch(`${apiUrl}/developer/image-search/download`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...product, images }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Falha no download.');
      const data = await response.json();
      setMessage(`Concluído. ${data.images?.length ?? 0} imagem(ns) salva(s).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Falha inesperada.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <input className="rounded-lg border p-3" placeholder="Nome do produto" value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
        <input className="rounded-lg border p-3" placeholder="Marca" value={product.brand ?? ''} onChange={(e) => setProduct({ ...product, brand: e.target.value })} />
        <input className="rounded-lg border p-3" placeholder="Modelo" value={product.model ?? ''} onChange={(e) => setProduct({ ...product, model: e.target.value })} />
        <input className="rounded-lg border p-3" placeholder="Volume/variação" value={product.volume ?? ''} onChange={(e) => setProduct({ ...product, volume: e.target.value })} />
      </div>

      <div className="flex items-center gap-3">
        <button className="rounded-lg border px-4 py-2" onClick={search} disabled={loading || product.name.trim().length < 2}>
          {loading ? 'Processando...' : 'Buscar imagens'}
        </button>
        <button className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" onClick={downloadSelected} disabled={loading || selected.size === 0}>
          Baixar selecionadas ({selected.size}/5)
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {candidates.map((candidate) => {
          const active = selected.has(candidate.id);
          return (
            <button key={candidate.id} type="button" onClick={() => toggle(candidate.id)} className={`overflow-hidden rounded-xl border text-left ${active ? 'ring-2' : ''}`}>
              <div className="aspect-square bg-neutral-100">
                {/* Thumbnail é usada somente para revisão; a URL original só é baixada após aprovação. */}
                {candidate.thumbnailUrl && <img src={candidate.thumbnailUrl} alt={candidate.title} className="h-full w-full object-contain" loading="lazy" />}
              </div>
              <div className="space-y-1 p-3">
                <div className="line-clamp-2 text-sm font-medium">{candidate.title || 'Sem título'}</div>
                <div className="text-xs opacity-70">{candidate.source || 'Origem desconhecida'}</div>
                <div className="text-xs opacity-70">Score {candidate.score}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
