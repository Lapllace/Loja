'use client';

/**
 * Listagem administrativa de produtos.
 *
 * Filtros usados são EXATAMENTE os que a API suporta (QueryProductDto):
 * busca textual, categoria, marca, preço mín/máx, status (ativo/inativo),
 * estoque e ordenação.
 *
 * Ações:
 *  - [Ver] abre a página pública do produto (/loja/produtos/:slug).
 *  - [Editar] abre o MESMO formulário do cadastro (/admin/produtos/:id/editar).
 *  - [Excluir] com confirmação explícita. O backend DELETE /products/:id
 *      recusa (409) produtos com OrderItem, CartItem, Review, Wishlist ou
 *      StockMovement — o histórico é preservado; nesses casos oferecemos
 *      "Descontinuar" (PATCH active=false), que desativa o produto mantendo
 *      pedidos e dados financeiros intactos.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveImageUrl } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Brand, Category, Product } from '@/lib/types';

const sortByOptions = [
  { value: 'name', label: 'Nome' },
  { value: 'price', label: 'Preço' },
  { value: 'stock', label: 'Estoque' },
  { value: 'createdAt', label: 'Data' },
] as const;

export default function AdminProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortBy, setSortBy] = useState<(typeof sortByOptions)[number]['value']>('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [discontinueMode, setDiscontinueMode] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    // Admin vê TODOS os produtos (inclusive inativos) — senão um produto
    // desativado fica invisível e impossível de reeditar.
    const result = await api.getProducts(undefined, undefined, { next: { revalidate: 0 } });
    setAllProducts(result);
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    api
      .getProducts(undefined, undefined, { next: { revalidate: 0 } })
      .then((result) => {
        if (!active) return;
        setAllProducts(result);
        setLoadingProducts(false);
      });
    void api.getCategories({ next: { revalidate: 0 } }).then((data) => {
      if (active) setCategories(data);
    });
    void api.getBrands({ next: { revalidate: 0 } }).then((data) => {
      if (active) setBrands(data);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const min = minPrice.trim() === '' ? null : Number(minPrice);
    const max = maxPrice.trim() === '' ? null : Number(maxPrice);

    const result = allProducts.filter((product) => {
      if (term) {
        const haystack = `${product.name} ${product.sku} ${product.description ?? ''}`.toLowerCase();
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
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return order === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [allProducts, search, categoryId, brandId, statusFilter, stockFilter, minPrice, maxPrice, sortBy, order]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);

    if (discontinueMode) {
      // Descontinuar = desativar. Mantém o registro e o histórico financeiro.
      const result = await api.updateProduct(deleteTarget.id, {
        sku: deleteTarget.sku,
        name: deleteTarget.name,
        slug: deleteTarget.slug,
        price: Number(deleteTarget.price),
        stock: deleteTarget.stock,
        categoryId: deleteTarget.categoryId,
        active: false,
      });
      setDeleteBusy(false);
      if (!result.ok) {
        setDeleteError('Não foi possível descontinuar o produto.');
        return;
      }
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
    setDeleteTarget(null);
    void loadProducts();
  };

  if (!isAdmin) return null;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Catálogo</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Produtos</h1>
      <p className="mt-2 text-muted-foreground">Gerencie os produtos cadastrados na loja.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/produtos/novo"
          className="inline-flex rounded-lg bg-accent px-5 py-3 font-semibold text-ink hover:bg-accent-dark"
        >
          + Novo produto
        </Link>
        {user?.role === 'OWNER' && (
          <Link
            href="/admin/desenvolvedor/imagens"
            className="inline-flex rounded-lg border border-border px-5 py-3 font-semibold text-foreground hover:bg-muted"
          >
            Busca de imagens
          </Link>
        )}
      </div>

      {/* Filtros — apenas os suportados pela API (QueryProductDto) */}
      <div className="mt-6 grid gap-3 rounded-xl border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, SKU ou descrição"
          className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Filtrar por marca"
        >
          <option value="">Todas as marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as typeof stockFilter)}
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
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
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="Preço mín."
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Preço mínimo"
        />
        <input
          type="number"
          min={0}
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="Preço máx."
          className="rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
          aria-label="Preço máximo"
        />
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            aria-label="Ordenar por"
          >
            {sortByOptions.map((o) => (
              <option key={o.value} value={o.value}>Ordenar: {o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="rounded-lg border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted"
            aria-label={`Ordem ${order === 'asc' ? 'crescente' : 'decrescente'}`}
          >
            {order === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="mt-6">
        {loadingProducts ? (
          <LoadingState message="Carregando produtos..." className="min-h-[200px]" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-border bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              {allProducts.length === 0 ? 'Nenhum produto cadastrado.' : 'Nenhum produto corresponde aos filtros.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Produto</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Marca</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Preço</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Estoque</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.images?.[0]?.url && (
                          <Image
                            src={resolveImageUrl(product.images[0].url) ?? ''}
                            alt={product.name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-foreground">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{product.brand?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-foreground">R$ {Number(product.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={product.stock === 0 ? 'text-error' : 'text-foreground'}>{product.stock}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          product.active
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/loja/produtos/${product.slug}`}
                          className="inline-flex rounded-lg border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/admin/produtos/${product.id}/editar`}
                          className="inline-flex rounded-lg border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(product);
                            setDeleteError(null);
                            setDiscontinueMode(false);
                          }}
                          className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            product.active
                              ? 'border-border text-foreground hover:bg-muted'
                              : 'bg-error/10 text-error hover:bg-error/20'
                          }`}
                        >
                          {product.active ? 'Excluir' : 'Descontinuada'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão / descontinuação */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => {
              setDeleteTarget(null);
              setDiscontinueMode(false);
            }}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-md rounded-2xl border-border bg-background p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">
              {discontinueMode ? 'Descontinuar produto?' : 'Excluir este produto?'}
            </h2>

            <dl className="mt-4 space-y-1 rounded-xl bg-muted/40 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Nome</dt>
                <dd className="text-right font-medium text-foreground">{deleteTarget.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Marca</dt>
                <dd className="text-right font-medium text-foreground">{deleteTarget.brand?.name ?? '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Estoque</dt>
                <dd className="text-right font-medium text-foreground">{deleteTarget.stock}</dd>
              </div>
            </dl>

            <p className="mt-4 text-sm text-muted-foreground">
              {discontinueMode
                ? 'O produto ficará inativo na loja. Pedidos, avaliações e dados financeiros são preservados.'
                : 'Esta ação remove o produto do banco de dados. O backend bloqueia a exclusão de produtos com pedidos, carrinho, avaliações, listas de desejos ou movimentações de estoque.'}
            </p>

            {deleteError && (
              <div className="mt-4 whitespace-pre-line rounded-xl border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                {deleteError}
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDiscontinueMode(false);
                }}
                className="rounded-lg border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              {discontinueMode ? (
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteBusy}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
                >
                  {deleteBusy ? 'Descontinuando...' : 'Descontinuar'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={deleteBusy}
                  className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-60"
                >
                  {deleteBusy ? 'Excluindo...' : 'Excluir'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
