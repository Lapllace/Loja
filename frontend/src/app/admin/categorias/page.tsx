'use client';

/**
 * Catálogo → Categorias.
 * Reutiliza exatamente os endpoints existentes:
 *   GET/POST /categories, PATCH/DELETE /categories/:id
 *
 * O backend recusa exclusão de categoria com subcategorias ou produtos
 * vinculados (409) — a UI apenas reporta o erro, sem tentar contornar.
 * A contagem de produtos é calculada no cliente a partir de GET /products,
 * pois o endpoint de categorias não devolve contadores.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { inputClassName } from '@/components/ui/Input';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard, AdminStatGrid } from '@/components/admin/AdminStatCard';
import { AdminFormSection } from '@/components/admin/AdminFormSection';
import { FeedbackBanner, type FeedbackTone } from '@/components/admin/FeedbackBanner';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import type { Category, Product } from '@/lib/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', active: true };

type StatusFilter = 'all' | 'active' | 'inactive';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const labelClassName = 'mb-1 block text-sm font-medium text-foreground';

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ações em lote (o backend não possui endpoint bulk: percorremos os IDs
  // selecionados com os endpoints PATCH/DELETE existentes).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    const [categoryData, productData] = await Promise.all([
      api.getCategories({ next: { revalidate: 0 } }),
      api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
    ]);
    setCategories(categoryData);
    setProducts(productData);
    // A lista foi refeita: manter seleção de itens que não existem mais confunde.
    setSelectedIds(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void Promise.all([
      api.getCategories({ next: { revalidate: 0 } }),
      api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
    ]).then(([categoryData, productData]) => {
      if (!active) return;
      setCategories(categoryData);
      setProducts(productData);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const productCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.categoryId, (map.get(product.categoryId) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const childCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const category of categories) {
      if (!category.parentId) continue;
      map.set(category.parentId, (map.get(category.parentId) ?? 0) + 1);
    }
    return map;
  }, [categories]);

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((category) => category.active).length;
    const withProducts = categories.filter(
      (category) => (productCounts.get(category.id) ?? 0) > 0,
    ).length;
    return { total, active, inactive: total - active, withProducts, withoutProducts: total - withProducts };
  }, [categories, productCounts]);

  const hasFilters = search.trim() !== '' || statusFilter !== 'all';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return categories
      .filter((category) => {
        if (statusFilter === 'active' && !category.active) return false;
        if (statusFilter === 'inactive' && category.active) return false;
        if (term) {
          const haystack = `${category.name} ${category.slug} ${category.description ?? ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [categories, search, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((category) => selectedIds.has(category.id));

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFeedback(null);

    const name = form.name.trim();
    if (!name) {
      setFormError('Informe o nome da categoria.');
      return;
    }
    const slug = form.slug.trim() || slugify(name);

    setSaving(true);
    const result = editingId
      ? await api.updateCategory(editingId, {
          name,
          slug,
          description: form.description.trim() || null,
          active: form.active,
        })
      : await api.createCategory({
          name,
          slug,
          description: form.description.trim() || undefined,
          active: form.active,
        });
    setSaving(false);

    if (!result.ok) {
      setFormError(
        result.status === 409
          ? 'Já existe categoria com este nome ou slug.'
          : result.status === 403
            ? 'Sua conta não tem permissão para alterar categorias.'
            : 'Não foi possível salvar a categoria.',
      );
      return;
    }

    setFeedback({
      tone: 'success',
      message: editingId ? `Categoria “${name}” atualizada.` : `Categoria “${name}” criada.`,
    });
    setForm(EMPTY_FORM);
    setEditingId(null);
    void load();
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      active: category.active,
    });
    setFormError(null);
    setFeedback(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);

    const result = await api.deleteCategory(deleteTarget.id);
    setDeleteBusy(false);

    if (!result.ok) {
      setDeleteError(
        result.status === 409
          ? 'Categoria possui subcategorias ou produtos vinculados — exclusão bloqueada pelo backend para preservar o catálogo.'
          : result.status === 404
            ? 'Categoria não encontrada (pode já ter sido removida).'
            : 'Não foi possível excluir a categoria.',
      );
      return;
    }

    setFeedback({ tone: 'success', message: `Categoria “${deleteTarget.name}” removida.` });
    setDeleteTarget(null);
    void load();
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(filtered.map((category) => category.id)) : new Set());
  };

  /** Ativa/desativa em lote reutilizando PATCH /categories/:id. */
  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const category of categories) {
      if (!selectedIds.has(category.id)) continue;
      const result = await api.updateCategory(category.id, {
        name: category.name,
        slug: category.slug,
        description: category.description ?? null,
        active,
      });
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkBusy(false);
    setSelectedIds(new Set());
    await load();
    setFeedback({
      tone: failCount > 0 ? 'warning' : 'success',
      message:
        `${successCount} categoria(s) ${active ? 'ativada(s)' : 'inativada(s)'}.` +
        (failCount > 0 ? ` ${failCount} falhou(aram).` : ''),
    });
  };

  /** Exclui em lote; o backend bloqueia (409) categorias com vínculos. */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const result = await api.deleteCategory(id);
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkBusy(false);
    setBulkDeleteOpen(false);
    setSelectedIds(new Set());
    await load();
    setFeedback({
      tone: failCount > 0 ? 'warning' : 'success',
      message:
        `${successCount} categoria(s) excluída(s).` +
        (failCount > 0
          ? ` ${failCount} não pôde(ram) ser excluída(s) por ter produtos ou subcategorias vinculados.`
          : ''),
    });
  };

  if (!isAdmin) return null;

  return (
    <div>
      <AdminPageHeader
        backHref="/admin/dashboard"
        eyebrow="Catálogo"
        title="Categorias"
        description="Organize as categorias da loja, acompanhe os produtos vinculados e mantenha a navegação do catálogo consistente."
        count={loading ? undefined : stats.total}
        countLabel={stats.total === 1 ? 'categoria' : 'categorias'}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total de categorias" value={stats.total} hint="Cadastradas no catálogo" />
        <AdminStatCard label="Ativas" value={stats.active} hint="Visíveis na loja" tone="success" />
        <AdminStatCard label="Inativas" value={stats.inactive} hint="Ocultas na loja" />
        <AdminStatCard
          label="Com produtos"
          value={stats.withProducts}
          hint={`${stats.withoutProducts} sem produtos vinculados`}
          tone="accent"
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

      {selectedIds.size > 0 && (
        <div className="mt-5 rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} categoria(s) selecionada(s)
            </span>
            <div className="flex flex-wrap gap-2">
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
                Excluir selecionadas
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

      <div className="mt-5 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="h-fit lg:sticky lg:top-6">
          <AdminFormSection
            title={editingId ? 'Editar categoria' : 'Nova categoria'}
            description={
              editingId
                ? 'Altere os dados e salve. Nome e slug precisam ser únicos.'
                : 'Crie uma categoria para organizar os produtos da loja.'
            }
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="category-name" className={labelClassName}>
                  Nome *
                </label>
                <input
                  id="category-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                      slug: editingId ? prev.slug : slugify(event.target.value),
                    }))
                  }
                  placeholder="Ex.: Acessórios"
                  className={inputClassName}
                  required
                />
              </div>

              <div>
                <label htmlFor="category-slug" className={labelClassName}>
                  Slug
                </label>
                <input
                  id="category-slug"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="Gerado a partir do nome"
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Endereço da categoria na loja. Deixe em branco para gerar automaticamente.
                </p>
              </div>

              <div>
                <label htmlFor="category-description" className={labelClassName}>
                  Descrição
                </label>
                <textarea
                  id="category-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descrição opcional"
                  rows={3}
                  className={inputClassName}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="mt-0.5 rounded border-input"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Categoria ativa</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Quando desmarcada, a categoria não aparece na loja.
                  </span>
                </span>
              </label>
            </div>

            {formError && (
              <FeedbackBanner tone="error" className="mt-4">
                {formError}
              </FeedbackBanner>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60"
              >
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar categoria'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </AdminFormSection>
        </form>

        {/* Listagem */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nome, slug ou descrição"
                  aria-label="Buscar categorias"
                  className={`${inputClassName} pl-9`}
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                className={inputClassName}
                aria-label="Filtrar por situação"
              >
                <option value="all">Todas as situações</option>
                <option value="active">Ativas</option>
                <option value="inactive">Inativas</option>
              </select>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
              <p className="text-muted-foreground">
                {loading ? (
                  'Carregando categorias...'
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
                    {filtered.length === 1 ? 'categoria encontrada' : 'categorias encontradas'}
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

          {loading ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <LoadingState message="Carregando categorias..." className="min-h-[220px]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <EmptyState
                title={categories.length === 0 ? 'Nenhuma categoria cadastrada' : 'Nenhuma categoria encontrada'}
                description={
                  categories.length === 0
                    ? 'Crie a primeira categoria no formulário ao lado.'
                    : 'Tente ajustar a busca ou o filtro de situação.'
                }
                action={
                  categories.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="rounded-lg border border-input bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <>
              {/* Tabela (md+) */}
              <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-b border-border bg-muted/50 text-left">
                      <tr>
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(event) => toggleSelectAll(event.target.checked)}
                            aria-label="Selecionar todas as categorias visíveis"
                            className="rounded border-input"
                          />
                        </th>
                        <th className="px-3 py-3 font-semibold text-foreground">Nome</th>
                        <th className="px-3 py-3 font-semibold text-foreground">Slug</th>
                        <th className="px-3 py-3 font-semibold text-foreground">Produtos</th>
                        <th className="px-3 py-3 font-semibold text-foreground">Status</th>
                        <th className="px-3 py-3 text-right font-semibold text-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((category) => {
                        const productCount = productCounts.get(category.id) ?? 0;
                        const childCount = childCounts.get(category.id) ?? 0;
                        return (
                          <tr
                            key={category.id}
                            className={`border-b border-border transition-colors last:border-b-0 hover:bg-muted/30 ${
                              selectedIds.has(category.id) ? 'bg-accent-soft/60' : ''
                            }`}
                          >
                            <td className="px-3 py-3 align-top">
                              <input
                                type="checkbox"
                                checked={selectedIds.has(category.id)}
                                onChange={(event) => toggleSelected(category.id, event.target.checked)}
                                aria-label={`Selecionar ${category.name}`}
                                className="mt-1 rounded border-input"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <p className="font-medium text-foreground">{category.name}</p>
                              {category.description && (
                                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                  {category.description}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                              {category.slug}
                            </td>
                            <td className="px-3 py-3">
                              <span className="font-medium text-foreground">{productCount}</span>
                              {childCount > 0 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  · {childCount} subcategoria(s)
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <StatusBadge tone={category.active ? 'success' : 'muted'}>
                                {category.active ? 'Ativa' : 'Inativa'}
                              </StatusBadge>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => startEdit(category)}
                                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteTarget(category);
                                    setDeleteError(null);
                                  }}
                                  className="rounded-lg bg-error/10 px-2.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/20"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cartões (até md) */}
              <div className="grid gap-3 md:hidden">
                {filtered.map((category) => {
                  const productCount = productCounts.get(category.id) ?? 0;
                  const childCount = childCounts.get(category.id) ?? 0;
                  return (
                    <article
                      key={category.id}
                      className={`rounded-2xl border bg-card p-4 shadow-sm ${
                        selectedIds.has(category.id) ? 'border-accent/50' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(category.id)}
                          onChange={(event) => toggleSelected(category.id, event.target.checked)}
                          aria-label={`Selecionar ${category.name}`}
                          className="mt-1 rounded border-input"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold leading-snug text-foreground">{category.name}</p>
                              <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                                {category.slug}
                              </p>
                            </div>
                            <StatusBadge tone={category.active ? 'success' : 'muted'}>
                              {category.active ? 'Ativa' : 'Inativa'}
                            </StatusBadge>
                          </div>

                          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                            <div>
                              <dt className="text-muted-foreground">Produtos</dt>
                              <dd className="mt-0.5 font-medium text-foreground">{productCount}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Subcategorias</dt>
                              <dd className="mt-0.5 font-medium text-foreground">{childCount}</dd>
                            </div>
                          </dl>

                          <div className="mt-3 flex justify-end gap-1.5 border-t border-border pt-3">
                            <button
                              type="button"
                              onClick={() => startEdit(category)}
                              className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteTarget(category);
                                setDeleteError(null);
                              }}
                              className="rounded-lg bg-error/10 px-2.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/20"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir categoria?"
        description={
          deleteTarget ? (
            <div className="space-y-3">
              <dl className="space-y-1 rounded-xl bg-muted/40 p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt>Nome</dt>
                  <dd className="text-right font-medium text-foreground">{deleteTarget.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Slug</dt>
                  <dd className="text-right font-mono text-xs text-foreground">{deleteTarget.slug}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt>Produtos vinculados</dt>
                  <dd className="text-right font-medium text-foreground">
                    {productCounts.get(deleteTarget.id) ?? 0}
                  </dd>
                </div>
              </dl>
              <p>
                O backend bloqueia a exclusão se houver subcategorias ou produtos vinculados. Nesse
                caso, a categoria é preservada.
              </p>
            </div>
          ) : null
        }
        confirmLabel="Excluir"
        tone="danger"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void handleDeleteConfirm()}
        onClose={() => {
          if (deleteBusy) return;
          setDeleteTarget(null);
          setDeleteError(null);
        }}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Excluir ${selectedIds.size} categoria(s)?`}
        description="Categorias com subcategorias ou produtos vinculados são preservadas pelo backend e não serão excluídas."
        confirmLabel="Excluir selecionadas"
        tone="danger"
        busy={bulkBusy}
        onConfirm={() => void handleBulkDelete()}
        onClose={() => {
          if (!bulkBusy) setBulkDeleteOpen(false);
        }}
      />
    </div>
  );
}
