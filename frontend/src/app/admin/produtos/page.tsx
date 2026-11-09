'use client';

/**
 * Listagem administrativa de produtos.
 *
 * Filtros usados são EXATAMENTE os que a API suporta (QueryProductDto):
 * busca textual, categoria, marca, preço mín/máx, status (ativo/inativo),
 * estoque e ordenação. A busca cobre nome e SKU; como `findAll` não pesquisa
 * SKU no backend, a filtragem é feita no cliente sobre a lista carregada.
 *
 * Ações:
 *  - [Ver] abre a página pública do produto (/loja/produtos/:slug).
 *  - [Editar] abre o MESMO formulário do cadastro (/admin/produtos/:id/editar).
 *  - [Estoque] ajusta o estoque individual via PATCH /products/:id.
 *  - [Excluir] com confirmação explícita. O backend DELETE /products/:id
 *      recusa (409) produtos com OrderItem, CartItem, Review, Wishlist ou
 *      StockMovement — o histórico é preservado; nesses casos oferecemos
 *      "Descontinuar" (PATCH active=false), que desativa o produto mantendo
 *      pedidos e dados financeiros intactos.
 *
 * Ações em lote reutilizam os endpoints existentes (sem endpoint bulk):
 * ajuste de estoque, ativar/desativar e exclusão, sempre item a item.
 */

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveImageUrl } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputClassName } from '@/components/ui/Input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard, AdminStatGrid } from '@/components/admin/AdminStatCard';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FeedbackBanner, type FeedbackTone } from '@/components/admin/FeedbackBanner';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { Brand, Category, Product, ProductFormPayload } from '@/lib/types';

const SORT_OPTIONS = [
  { value: 'name', label: 'Nome' },
  { value: 'sku', label: 'SKU' },
  { value: 'price', label: 'Preço' },
  { value: 'stock', label: 'Estoque' },
  { value: 'createdAt', label: 'Data de cadastro' },
] as const;

type SortField = (typeof SORT_OPTIONS)[number]['value'];
type StatusFilter = 'all' | 'active' | 'inactive';
type StockFilter = 'all' | 'in' | 'out';

const BULK_STOCK_MODES = [
  { value: 'add', label: 'Adicionar (+)' },
  { value: 'remove', label: 'Remover (−)' },
  { value: 'set', label: 'Definir valor' },
] as const;

type BulkStockMode = (typeof BULK_STOCK_MODES)[number]['value'];

/** Novo estoque conforme o modo; nunca retorna valor negativo. */
function nextStockValue(current: number, quantity: number, mode: BulkStockMode): number {
  if (mode === 'add') return current + quantity;
  if (mode === 'remove') return Math.max(0, current - quantity);
  return quantity;
}

/**
 * Payload mínimo para atualizações pontuais. Os campos ausentes permanecem
 * inalterados no backend (PATCH parcial).
 */
function patchPayload(product: Product, overrides: Partial<ProductFormPayload> = {}): ProductFormPayload {
  return {
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    stock: product.stock,
    categoryId: product.categoryId,
    active: product.active,
    ...overrides,
  };
}

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const isOwner = user?.role === 'OWNER';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [discontinueMode, setDiscontinueMode] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkStockModalOpen, setBulkStockModalOpen] = useState(false);
  const [bulkStockMode, setBulkStockMode] = useState<BulkStockMode>('add');
  const [bulkStockQuantity, setBulkStockQuantity] = useState('');
  const [bulkStockBusy, setBulkStockBusy] = useState(false);
  const [bulkStockError, setBulkStockError] = useState<string | null>(null);

  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setLoadError(null);
    try {
      // Admin vê TODOS os produtos (inclusive inativos) — senão um produto
      // desativado fica invisível e impossível de reeditar.
      const result = await api.getProducts(undefined, undefined, {
        next: { revalidate: 0 },
        throwOnError: true,
      });
      setAllProducts(result);
      // Remove da seleção itens que deixaram de existir após uma operação.
      setSelectedIds((previous) => {
        if (previous.size === 0) return previous;
        const next = new Set(
          [...previous].filter((id) => result.some((product) => product.id === id)),
        );
        return next.size === previous.size ? previous : next;
      });
    } catch {
      setLoadError(
        'Não foi possível carregar os produtos. Verifique a conexão com a API e tente novamente.',
      );
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;

    // Adia a chamada para não executar setState diretamente no corpo do efeito.
    const timer = setTimeout(() => {
      void loadProducts();
    }, 0);
    void api.getCategories({ next: { revalidate: 0 } }).then((data) => {
      if (active) setCategories(data);
    });
    void api.getBrands({ next: { revalidate: 0 } }).then((data) => {
      if (active) setBrands(data);
    });

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isAdmin, loadProducts]);

  const stats = useMemo(() => {
    const total = allProducts.length;
    const active = allProducts.filter((product) => product.active).length;
    const outOfStock = allProducts.filter((product) => product.stock <= 0).length;
    const units = allProducts.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
    return { total, active, inactive: total - active, outOfStock, units };
  }, [allProducts]);

  const hasFilters =
    search.trim() !== '' ||
    categoryId !== '' ||
    brandId !== '' ||
    statusFilter !== 'all' ||
    stockFilter !== 'all' ||
    minPrice.trim() !== '' ||
    maxPrice.trim() !== '';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minPrice.trim() === '' ? null : Number(minPrice);
    const max = maxPrice.trim() === '' ? null : Number(maxPrice);

    const result = allProducts.filter((product) => {
      if (term) {
        const haystack = `${product.name} ${product.sku}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (categoryId && product.categoryId !== categoryId) return false;
      if (brandId && product.brandId !== brandId) return false;
      if (statusFilter === 'active' && !product.active) return false;
      if (statusFilter === 'inactive' && product.active) return false;
      if (stockFilter === 'in' && product.stock <= 0) return false;
      if (stockFilter === 'out' && product.stock > 0) return false;
      const price = Number(product.price);
      if (min !== null && Number.isFinite(min) && price < min) return false;
      if (max !== null && Number.isFinite(max) && price > max) return false;
      return true;
    });

    result.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      if (sortBy === 'name') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      } else if (sortBy === 'sku') {
        av = a.sku.toLowerCase();
        bv = b.sku.toLowerCase();
      } else if (sortBy === 'price') {
        av = Number(a.price);
        bv = Number(b.price);
      } else if (sortBy === 'stock') {
        av = a.stock;
        bv = b.stock;
      } else {
        av = a.createdAt;
        bv = b.createdAt;
      }
      const cmp =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv, 'pt-BR')
          : Number(av) - Number(bv);
      return order === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    allProducts,
    search,
    categoryId,
    brandId,
    statusFilter,
    stockFilter,
    minPrice,
    maxPrice,
    sortBy,
    order,
  ]);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((product) => selectedIds.has(product.id));

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setBrandId('');
    setStatusFilter('all');
    setStockFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('name');
    setOrder('asc');
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filtered.map((product) => product.id)) : new Set());
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);

    if (discontinueMode) {
      // Descontinuar = desativar. Mantém o registro e o histórico financeiro.
      const result = await api.updateProduct(
        deleteTarget.id,
        patchPayload(deleteTarget, { active: false }),
      );
      setDeleteBusy(false);
      if (!result.ok) {
        setDeleteError('Não foi possível descontinuar o produto.');
        return;
      }
      setFeedback({
        tone: 'success',
        message: `“${deleteTarget.name}” foi descontinuado e não aparece mais na loja.`,
      });
      setDeleteTarget(null);
      setDiscontinueMode(false);
      void loadProducts();
      return;
    }

    const result = await api.deleteProduct(deleteTarget.id);
    setDeleteBusy(false);
    if (!result.ok) {
      if (result.status === 409) {
        setDeleteError(
          'Este produto está vinculado a pedidos, carrinho, avaliações ou movimentações de estoque. ' +
            'A exclusão foi bloqueada pelo backend para preservar o histórico. Use "Descontinuar".',
        );
        setDiscontinueMode(true);
        return;
      }
      setDeleteError(
        result.status === 404
          ? 'Produto não encontrado (pode já ter sido removido).'
          : 'Não foi possível excluir o produto.',
      );
      return;
    }

    setFeedback({ tone: 'success', message: `Produto “${deleteTarget.name}” excluído.` });
    setDeleteTarget(null);
    void loadProducts();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const result = await api.deleteProduct(id);
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkBusy(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    void loadProducts();

    if (failCount > 0) {
      setFeedback({
        tone: 'warning',
        message:
          `${successCount} produto(s) excluído(s) e ${failCount} não pôde(ram) ser excluído(s). ` +
          'Produtos com pedidos, carrinho, avaliações ou movimentações de estoque são preservados pelo backend — use "Descontinuar".',
      });
    } else {
      setFeedback({ tone: 'success', message: `${successCount} produto(s) excluído(s).` });
    }
  };

  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const product of allProducts) {
      if (!selectedIds.has(product.id)) continue;
      const result = await api.updateProduct(product.id, patchPayload(product, { active }));
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkBusy(false);
    setSelectedIds(new Set());
    void loadProducts();

    setFeedback({
      tone: failCount > 0 ? 'warning' : 'success',
      message:
        `${successCount} produto(s) ${active ? 'ativado(s)' : 'desativado(s)'}.` +
        (failCount > 0 ? ` ${failCount} falhou(aram).` : ''),
    });
  };

  const handleBulkStock = async () => {
    const quantity = parseInt(bulkStockQuantity, 10);
    const invalid = Number.isNaN(quantity) || quantity < 0 || (bulkStockMode !== 'set' && quantity <= 0);
    if (invalid) {
      setBulkStockError(
        bulkStockMode === 'set'
          ? 'Informe um estoque final maior ou igual a zero.'
          : 'Informe uma quantidade inteira maior que zero.',
      );
      return;
    }

    setBulkStockError(null);
    setBulkStockBusy(true);

    let successCount = 0;
    let failCount = 0;

    for (const product of allProducts) {
      if (!selectedIds.has(product.id)) continue;
      const result = await api.updateProduct(
        product.id,
        patchPayload(product, {
          stock: nextStockValue(product.stock, quantity, bulkStockMode),
        }),
      );
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkStockBusy(false);
    setBulkStockModalOpen(false);
    setBulkStockQuantity('');
    setSelectedIds(new Set());
    void loadProducts();

    setFeedback({
      tone: failCount > 0 ? 'warning' : 'success',
      message:
        `Estoque ajustado em ${successCount} produto(s).` +
        (failCount > 0 ? ` ${failCount} falhou(aram).` : ''),
    });
  };

  const handleToggleActive = async (product: Product) => {
    setActionBusyId(product.id);
    setFeedback(null);
    const nextActive = !product.active;
    const result = await api.updateProduct(product.id, patchPayload(product, { active: nextActive }));
    setActionBusyId(null);

    if (!result.ok) {
      setFeedback({ tone: 'error', message: 'Não foi possível alterar a situação do produto.' });
      return;
    }

    setFeedback({
      tone: 'success',
      message: `“${product.name}” ${nextActive ? 'ativado' : 'desativado'}.`,
    });
    void loadProducts();
  };

  const openStockFor = (product: Product) => {
    setSelectedIds(new Set([product.id]));
    setBulkStockMode('add');
    setBulkStockQuantity('');
    setBulkStockError(null);
    setBulkStockModalOpen(true);
  };

  const closeDeleteDialog = () => {
    if (deleteBusy) return;
    setDeleteTarget(null);
    setDeleteError(null);
    setDiscontinueMode(false);
  };

  if (!isAdmin) return null;

  const renderActions = (product: Product) => (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link
        href={`/loja/produtos/${product.slug}`}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Ver
      </Link>
      <Link
        href={`/admin/produtos/${product.id}/editar`}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={() => openStockFor(product)}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Estoque
      </button>
      <button
        type="button"
        onClick={() => void handleToggleActive(product)}
        disabled={actionBusyId === product.id}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
      >
        {actionBusyId === product.id ? '...' : product.active ? 'Desativar' : 'Ativar'}
      </button>
      <button
        type="button"
        onClick={() => {
          setDeleteTarget(product);
          setDeleteError(null);
          setDiscontinueMode(false);
        }}
        className="rounded-lg bg-error/10 px-2.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/20"
      >
        Excluir
      </button>
    </div>
  );

  return (
    <div>
      <AdminPageHeader
        backHref="/admin/dashboard"
        eyebrow="Catálogo"
        title="Produtos"
        description="Gerencie o catálogo, a disponibilidade e o estoque dos produtos da loja."
        count={loadingProducts ? undefined : stats.total}
        countLabel={stats.total === 1 ? 'produto' : 'produtos'}
        actions={
          <>
            <Link
              href="/admin/produtos/novo"
              className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark"
            >
              + Novo produto
            </Link>
            <Link
              href="/admin/produtos/importar"
              className="inline-flex h-10 items-center rounded-lg border border-input bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Importar lista
            </Link>
            {isOwner && (
              <Link
                href="/admin/desenvolvedor/imagens"
                className="inline-flex h-10 items-center rounded-lg border border-input bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Busca de imagens
              </Link>
            )}
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="Total de produtos"
          value={stats.total}
          hint={`${stats.units} unidade(s) em estoque`}
          tone="default"
        />
        <AdminStatCard label="Ativos" value={stats.active} hint="Visíveis na loja" tone="success" />
        <AdminStatCard label="Inativos" value={stats.inactive} hint="Ocultos na loja" tone="default" />
        <AdminStatCard
          label="Sem estoque"
          value={stats.outOfStock}
          hint="Estoque zerado"
          tone={stats.outOfStock > 0 ? 'error' : 'default'}
        />
      </AdminStatGrid>

      {feedback && (
        <FeedbackBanner
          tone={feedback.tone}
          className="mt-5"
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </FeedbackBanner>
      )}

      {/* Ações em lote */}
      {selectedIds.size > 0 && (
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} produto(s) selecionado(s)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setBulkStockMode('add');
                  setBulkStockQuantity('');
                  setBulkStockError(null);
                  setBulkStockModalOpen(true);
                }}
                disabled={bulkBusy}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Ajustar estoque
              </button>
              <button
                type="button"
                onClick={() => void handleBulkActive(true)}
                disabled={bulkBusy}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Ativar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkActive(false)}
                disabled={bulkBusy}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Desativar
              </button>
              <button
                type="button"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={bulkBusy}
                className="rounded-lg bg-error px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-error/90 disabled:opacity-60"
              >
                Excluir selecionados
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkBusy}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros — apenas os suportados pela API, aplicados no cliente */}
      <div className="mt-5 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome ou SKU"
              aria-label="Buscar produtos por nome ou SKU"
              className={`${inputClassName} pl-9`}
            />
          </div>

          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={inputClassName}
            aria-label="Filtrar por categoria"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
            className={inputClassName}
            aria-label="Filtrar por marca"
          >
            <option value="">Todas as marcas</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className={inputClassName}
            aria-label="Filtrar por situação"
          >
            <option value="all">Todas as situações</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>

          <select
            value={stockFilter}
            onChange={(event) => setStockFilter(event.target.value as StockFilter)}
            className={inputClassName}
            aria-label="Filtrar por estoque"
          >
            <option value="all">Estoque: todos</option>
            <option value="in">Com estoque</option>
            <option value="out">Sem estoque</option>
          </select>

          <input
            type="number"
            min={0}
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="Preço mín."
            aria-label="Preço mínimo"
            className={inputClassName}
          />

          <input
            type="number"
            min={0}
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Preço máx."
            aria-label="Preço máximo"
            className={inputClassName}
          />

          <div className="flex gap-2 md:col-span-2 xl:col-span-2">
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortField)}
              className={inputClassName}
              aria-label="Ordenar por"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Ordenar: {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOrder((previous) => (previous === 'asc' ? 'desc' : 'asc'))}
              className="inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-sm font-bold text-foreground transition-colors hover:bg-muted"
              aria-label={order === 'asc' ? 'Ordem crescente (clique para decrescente)' : 'Ordem decrescente (clique para crescente)'}
              title={order === 'asc' ? 'Crescente' : 'Decrescente'}
            >
              {order === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
          <p className="text-muted-foreground">
            {loadingProducts ? (
              'Carregando produtos...'
            ) : (
              <>
                <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
                {filtered.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
                {hasFilters && ` de ${stats.total}`}
              </>
            )}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-accent transition-colors hover:text-accent-dark hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <div className="mt-5">
        {loadingProducts ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <LoadingState message="Carregando produtos..." className="min-h-[240px]" />
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-error/30 bg-card p-6">
            <EmptyState
              title="Não foi possível carregar os produtos"
              description={loadError}
              icon={
                <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM10.34 3.378 1.7 18.126c-.866 1.5.217 3.374 1.948 3.374h16.706c1.73 0 2.813-1.874 1.947-3.374L13.66 3.378a1.875 1.875 0 0 0-3.32 0Z" />
                </svg>
              }
              action={
                <button
                  type="button"
                  onClick={() => void loadProducts()}
                  className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  Tentar novamente
                </button>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <EmptyState
              title={allProducts.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
              description={
                allProducts.length === 0
                  ? 'Cadastre o primeiro produto para começar a montar o catálogo.'
                  : 'Tente ajustar a busca ou os filtros aplicados.'
              }
              icon={
                <svg className="size-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              }
              action={
                allProducts.length === 0 ? (
                  <Link
                    href="/admin/produtos/novo"
                    className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                  >
                    + Novo produto
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Limpar filtros
                  </button>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Tabela (lg+) */}
            <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead className="border-b border-border bg-muted/50 text-left">
                    <tr>
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                          aria-label="Selecionar todos os produtos visíveis"
                          className="rounded border-input"
                        />
                      </th>
                      <th className="px-3 py-3 font-semibold text-foreground">Produto</th>
                      <th className="px-3 py-3 font-semibold text-foreground">SKU</th>
                      <th className="px-3 py-3 font-semibold text-foreground">Categoria</th>
                      <th className="hidden px-3 py-3 font-semibold text-foreground xl:table-cell">Marca</th>
                      <th className="px-3 py-3 font-semibold text-foreground">Preço</th>
                      <th className="px-3 py-3 font-semibold text-foreground">Estoque</th>
                      <th className="px-3 py-3 font-semibold text-foreground">Situação</th>
                      <th className="px-3 py-3 text-right font-semibold text-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((product) => (
                      <tr
                        key={product.id}
                        className={`border-b border-border transition-colors last:border-b-0 hover:bg-muted/30 ${
                          selectedIds.has(product.id) ? 'bg-accent-soft/60' : ''
                        }`}
                      >
                        <td className="px-3 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(product.id)}
                            onChange={(event) => toggleSelected(product.id, event.target.checked)}
                            aria-label={`Selecionar ${product.name}`}
                            className="mt-1 rounded border-input"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            {product.images?.[0]?.url && (
                              <Image
                                src={resolveImageUrl(product.images[0].url) ?? ''}
                                alt={product.name}
                                width={36}
                                height={36}
                                className="size-9 shrink-0 rounded-lg object-cover"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium leading-snug text-foreground">{product.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-muted-foreground">
                                  {product.category?.name ?? 'Sem categoria'}
                                </span>
                                {product.featured && <StatusBadge tone="accent">Destaque</StatusBadge>}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-muted-foreground">{product.sku}</td>
                        <td className="px-3 py-3 text-muted-foreground">
                          {product.category?.name ?? '—'}
                        </td>
                        <td className="hidden px-3 py-3 text-muted-foreground xl:table-cell">
                          {product.brand?.name ?? '—'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-semibold text-foreground">
                          {formatPrice(product.price)}
                        </td>
                        <td className="px-3 py-3">
                          {product.stock > 0 ? (
                            <span className="font-medium text-foreground">{product.stock}</span>
                          ) : (
                            <StatusBadge tone="error">Sem estoque</StatusBadge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={product.active ? 'success' : 'muted'}>
                            {product.active ? 'Ativo' : 'Inativo'}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-end">{renderActions(product)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cartões (até lg) */}
            <div className="grid gap-3 lg:hidden">
              {filtered.map((product) => (
                <article
                  key={product.id}
                  className={`rounded-2xl border bg-card p-4 shadow-sm ${
                    selectedIds.has(product.id) ? 'border-accent/50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(product.id)}
                      onChange={(event) => toggleSelected(product.id, event.target.checked)}
                      aria-label={`Selecionar ${product.name}`}
                      className="mt-1 rounded border-input"
                    />
                    {product.images?.[0]?.url && (
                      <Image
                        src={resolveImageUrl(product.images[0].url) ?? ''}
                        alt={product.name}
                        width={48}
                        height={48}
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug text-foreground">{product.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                        <StatusBadge tone={product.active ? 'success' : 'muted'}>
                          {product.active ? 'Ativo' : 'Inativo'}
                        </StatusBadge>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Categoria</dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            {product.category?.name ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Marca</dt>
                          <dd className="mt-0.5 font-medium text-foreground">
                            {product.brand?.name ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Preço</dt>
                          <dd className="mt-0.5 font-semibold text-foreground">
                            {formatPrice(product.price)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Estoque</dt>
                          <dd className="mt-0.5">
                            {product.stock > 0 ? (
                              <span className="font-medium text-foreground">{product.stock} un.</span>
                            ) : (
                              <StatusBadge tone="error">Sem estoque</StatusBadge>
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-3 border-t border-border pt-3">{renderActions(product)}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={discontinueMode ? 'Descontinuar produto?' : 'Excluir este produto?'}
        description={
          deleteTarget ? (
            <div className="space-y-3">
              <dl className="space-y-1 rounded-xl bg-muted/40 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Nome</dt>
                  <dd className="text-right font-medium text-foreground">{deleteTarget.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>SKU</dt>
                  <dd className="text-right font-mono text-xs text-foreground">{deleteTarget.sku}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Estoque</dt>
                  <dd className="text-right font-medium text-foreground">{deleteTarget.stock} un.</dd>
                </div>
              </dl>
              <p>
                {discontinueMode
                  ? 'O produto ficará inativo na loja. Pedidos, avaliações e dados financeiros são preservados.'
                  : 'Esta ação remove o produto do banco de dados. O backend bloqueia a exclusão de produtos com pedidos, carrinho, avaliações, listas de desejos ou movimentações de estoque.'}
              </p>
            </div>
          ) : null
        }
        confirmLabel={discontinueMode ? 'Descontinuar' : 'Excluir'}
        tone={discontinueMode ? 'primary' : 'danger'}
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={closeDeleteDialog}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Excluir ${selectedIds.size} produto(s)?`}
        description="Esta ação não pode ser desfeita. Produtos com pedidos, carrinho, avaliações ou movimentações de estoque são preservados pelo backend e não serão excluídos."
        confirmLabel="Excluir selecionados"
        tone="danger"
        busy={bulkBusy}
        onConfirm={() => void handleBulkDelete()}
        onClose={() => !bulkBusy && setBulkDeleteOpen(false)}
      />

      {/* Modal de estoque */}
      {bulkStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="bulk-stock-title">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => !bulkStockBusy && setBulkStockModalOpen(false)}
            className="absolute inset-0 bg-ink/50 backdrop-blur-[1px]"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 id="bulk-stock-title" className="text-lg font-bold text-foreground">
              Ajustar estoque
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedIds.size} produto(s) selecionado(s). O backend registra a alteração como
              movimentação do tipo <span className="font-semibold text-foreground">ADJUSTMENT</span>.
            </p>

            <fieldset className="mt-4">
              <legend className="mb-2 block text-sm font-medium text-foreground">Operação</legend>
              <div className="flex flex-wrap gap-2">
                {BULK_STOCK_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => setBulkStockMode(mode.value)}
                    aria-pressed={bulkStockMode === mode.value}
                    className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                      bulkStockMode === mode.value
                        ? 'bg-accent text-white'
                        : 'border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <label htmlFor="bulkStock" className="mb-1.5 block text-sm font-medium text-foreground">
                {bulkStockMode === 'set' ? 'Novo estoque' : 'Quantidade'}
              </label>
              <input
                id="bulkStock"
                type="number"
                min={bulkStockMode === 'set' ? 0 : 1}
                value={bulkStockQuantity}
                onChange={(event) => {
                  setBulkStockQuantity(event.target.value);
                  setBulkStockError(null);
                }}
                className={inputClassName}
                placeholder={bulkStockMode === 'set' ? '50' : '10'}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {bulkStockMode === 'add'
                  ? 'Soma a quantidade informada ao estoque atual de cada produto.'
                  : bulkStockMode === 'remove'
                    ? 'Subtrai a quantidade informada; o estoque nunca fica negativo.'
                    : 'Define o mesmo valor de estoque para todos os produtos selecionados.'}
              </p>
            </div>

            {bulkStockError && (
              <div role="alert" className="mt-3 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
                {bulkStockError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkStockModalOpen(false)}
                disabled={bulkStockBusy}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkStock()}
                disabled={bulkStockBusy}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {bulkStockBusy
                  ? 'Aplicando...'
                  : bulkStockMode === 'add'
                    ? 'Adicionar'
                    : bulkStockMode === 'remove'
                      ? 'Remover'
                      : 'Definir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
