'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { ImageCandidate, SelectedImageCandidate } from '@/lib/types';
import { Button } from '@/components/ui/Button';

/** Máximo de imagens selecionáveis (limite do backend também é 5). */
export const IMAGE_SEARCH_MAX_SELECTION = 5;

/** Debounce do autocomplete (ms) — evita uma chamada por tecla. */
const SUGGEST_DEBOUNCE_MS = 300;

/** Mínimo de caracteres para pedir sugestões (espelha o backend). */
const MIN_SUGGEST_QUERY_LENGTH = 2;

interface ImageSearchDialogProps {
  /** Aberto/fechado. O componente não renderiza nada quando `false`. */
  open: boolean;
  /** Fecha o diálogo (ESC, backdrop, botão fechar). */
  onClose: () => void;
  /**
   * Termo inicial da busca. Normalmente o "Nome" já digitado no formulário —
   * o usuário pode alterá-lo antes de pesquisar.
   * NENHUM `productId` é necessário: a busca é independente do produto.
   */
  initialQuery?: string;
  /** Confirma a seleção. As imagens só serão baixadas ao salvar o produto. */
  onConfirm: (images: SelectedImageCandidate[]) => void;
  /** Já selecionadas anteriormente, para não perder o contexto ao reabrir. */
  initiallySelected?: SelectedImageCandidate[];
  maxSelection?: number;
}

/**
 * Diálogo reutilizável de busca de imagens.
 *
 * Usa a API `POST /developer/image-search/search` (somente OWNER) exigindo
 * apenas o termo de pesquisa. Não conhece Product ID nem baixa arquivos: apenas
 * devolve as candidatas escolhidas via `onConfirm`.
 *
 * Reutilizado pelo cadastro/edição de produto e pela ferramenta avançada.
 */
export function ImageSearchDialog({
  open,
  onClose,
  initialQuery = '',
  onConfirm,
  initiallySelected = [],
  maxSelection = IMAGE_SEARCH_MAX_SELECTION,
}: ImageSearchDialogProps) {
  const [query, setQuery] = useState(initialQuery);
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [selected, setSelected] = useState<SelectedImageCandidate[]>(initiallySelected);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  /** Sugestões do autocomplete (não são a busca de imagens). */
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  /** Evita mostrar sugestões de uma resposta que chegou fora de ordem. */
  const suggestSeq = useRef(0);

  // Foca o campo ao abrir. O estado inicial é definido no `useState` acima e
  // resetado pelo `key` que o consumidor aplica ao componente — não usamos
  // setState dentro de efeito (evita renders em cascata).
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Fecha com ESC.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * Autocomplete com debounce.
   *
   * IMPORTANTE: aqui NÃO se chama a busca de imagens. O autocomplete é uma
   * operação leve e separada da pesquisa pesada (que só roda em Enter/clique no
   * botão "Buscar").
   */
  useEffect(() => {
    if (!open) return;

    const term = query.trim();

    // Não consulta com menos de 2 caracteres. (A lista exibida já é derivada de
    // `suggestions`, então aqui basta não agendar a chamada — sem setState.)
    if (term.length < MIN_SUGGEST_QUERY_LENGTH) {
      return;
    }

    const timer = setTimeout(async () => {
      const seq = ++suggestSeq.current;
      const result = await api.suggestImages(term);

      // Descarta respostas obsoletas (usuário digitou mais nesse meio-tempo).
      if (seq !== suggestSeq.current) return;
      // Uma falha no autocomplete não deve incomodar o usuário.
      if (!result.ok) return;

      setSuggestions(result.data.suggestions ?? []);
      setShowSuggestions(true);
    }, SUGGEST_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, open]);

  /**
   * Sugestões efetivamente exibidas. Derivadas, não armazenadas: assim a regra
   * de comprimento mínimo não precisa de `setState` dentro de efeito.
   */
  const visibleSuggestions = useMemo(
    () =>
      query.trim().length < MIN_SUGGEST_QUERY_LENGTH ? [] : suggestions,
    [query, suggestions],
  );

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  const handleSearch = useCallback(async () => {
    const term = query.trim();
    if (!term) {
      setError('Informe um termo de pesquisa.');
      return;
    }

    setSearching(true);
    setError(null);

    const result = await api.searchImages({ query: term });
    setSearching(false);
    setSearched(true);

    if (!result.ok) {
      setError(
        result.status === 403
          ? 'Acesso negado. Apenas OWNERS podem buscar imagens.'
          : result.status === 401
            ? 'Sessão expirada. Faça login novamente.'
            : result.status === 400
              ? 'Termo de pesquisa inválido.'
              : 'Não foi possível buscar imagens agora. Tente novamente.',
      );
      setCandidates([]);
      return;
    }

    setCandidates(result.data.candidates ?? []);
  }, [query]);

  const toggle = useCallback(
    (candidate: ImageCandidate) => {
      setError(null);
      setSelected((current) => {
        if (current.some((s) => s.id === candidate.id)) {
          return current.filter((s) => s.id !== candidate.id);
        }
        if (current.length >= maxSelection) {
          setError(`Máximo de ${maxSelection} imagens selecionadas.`);
          return current;
        }
        return [
          ...current,
          {
            id: candidate.id,
            title: candidate.title,
            source: candidate.source,
            sourceUrl: candidate.sourceUrl,
            imageUrl: candidate.imageUrl,
            query: candidate.query,
            thumbnailUrl: candidate.thumbnailUrl,
          },
        ];
      });
    },
    [maxSelection],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar imagens na internet"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-5xl rounded-2xl border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 className="text-xl font-bold text-foreground">Buscar imagens na internet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste o termo se quiser e selecione até {maxSelection} imagens. Elas serão
              baixadas ao salvar o produto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Campo de pesquisa — apenas o termo é exigido */}
        <div className="border-b border-border p-5">
          <label htmlFor="image-search-query" className="mb-1.5 block text-sm font-medium text-foreground">
            O que você está procurando?
          </label>
          <div className="flex gap-2">
            <div className="relative w-full">
              <input
                ref={inputRef}
                id="image-search-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => {
                  if (visibleSuggestions.length > 0) setShowSuggestions(true);
                }}
                onBlur={() => {
                  // Pequeno atraso para permitir o clique na sugestao.
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setShowSuggestions(false);
                    void handleSearch();
                  }
                  if (e.key === 'Escape' && showSuggestions) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSuggestions(false);
                  }
                }}
                maxLength={200}
                autoComplete="off"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions && visibleSuggestions.length > 0}
                aria-controls="image-search-suggestions"
                className="w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                placeholder="Ex.: Asad Lattafa perfume 100ml"
              />

              {/* Sugestoes do autocomplete (ate 3) — NAO e a busca de imagens */}
              {showSuggestions && visibleSuggestions.length > 0 && (
                <ul
                  id="image-search-suggestions"
                  role="listbox"
                  className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border-border bg-background shadow-lg"
                >
                  {visibleSuggestions.map((suggestion) => (
                    <li key={suggestion} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setQuery(suggestion);
                          setShowSuggestions(false);
                        }}
                        className="block w-full px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button
              type="button"
              onClick={() => {
                setShowSuggestions(false);
                void handleSearch();
              }}
              disabled={searching || !query.trim()}
            >
              {searching ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          )}
        </div>

        {/* Resultados */}
        <div className="max-h-[55vh] overflow-y-auto p-5">
          {searching && (
            <p className="py-10 text-center text-sm text-muted-foreground">Buscando imagens...</p>
          )}

          {!searching && searched && candidates.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma imagem encontrada. Tente outro termo.
            </p>
          )}

          {!searching && !searched && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Informe o termo e clique em Buscar para ver as candidatas.
            </p>
          )}

          {!searching && candidates.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {candidates.map((candidate) => {
                const active = selectedIds.has(candidate.id);
                const preview = candidate.thumbnailUrl || candidate.imageUrl;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggle(candidate)}
                    aria-pressed={active}
                    className={`group relative overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                      active ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent'
                    }`}
                  >
                    <div className="relative aspect-square bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt={candidate.title || 'Candidata'}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                      {active && (
                        <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-ink">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 p-2.5">
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {candidate.title || 'Sem título'}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {candidate.source || 'Origem desconhecida'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex flex-col gap-3 border-t border-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{selected.length}</span> de {maxSelection}{' '}
            selecionadas
          </p>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={selected.length === 0}
              onClick={() => {
                onConfirm(selected);
                onClose();
              }}
            >
              Adicionar selecionadas ({selected.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Reexportado para conveniência dos consumidores. */
export type { SelectedImageCandidate };
