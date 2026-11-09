'use client';

/**
 * Catálogo → Marcas.
 * Reutiliza exatamente os endpoints existentes:
 *   GET/POST /brands, PATCH/DELETE /brands/:id
 * O backend recusa exclusão de marca com produtos vinculados (409).
 * A contagem de produtos é calculada no cliente a partir de GET /products,
 * pois o endpoint de marcas não devolve contadores.
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
import type { Brand, Product } from '@/lib/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  website: string;
  active: boolean;
}

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', website: '', active: true };

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

export default function AdminBrandsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Ações em lote (sem endpoint bulk no backend: percorremos os IDs
  // selecionados com os endpoints PATCH/DELETE existentes).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [brandData, productData] = await Promise.all([
      api.getBrands({ next: { revalidate: 0 } }),
      api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
    ]);
    setBrands(brandData);
    setProducts(productData);
    // A lista foi refeita: manter seleção de itens que não existem mais confunde.
    setSelectedIds(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    void Promise.all([
      api.getBrands({ next: { revalidate: 0 } }),
      api.getProducts(undefined, undefined, { next: { revalidate: 0 } }),
    ]).then(([brandData, productData]) => {
      if (!active) return;
      setBrands(brandData);
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
      if (!product.brandId) continue;
      map.set(product.brandId, (map.get(product.brandId) ?? 0) + 1);
    }
    return map;
  }, [products]);

  const stats = useMemo(() => {
    const total = brands.length;
    const active = brands.filter((brand) => brand.active).length;
    const withProducts = brands.filter((brand) => (productCounts.get(brand.id) ?? 0) > 0).length;
    return { total, active, inactive: total - active, withProducts, withoutProducts: total - withProducts };
  }, [brands, productCounts]);

  const hasFilters = search.trim() !== '' || statusFilter !== 'all';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return brands
      .filter((brand) => {
        if (statusFilter === 'active' && !brand.active) return false;
        if (statusFilter === 'inactive' && brand.active) return false;
        if (term) {
          const haystack =
            `${brand.name} ${brand.slug} ${brand.description ?? ''} ${brand.website ?? ''}`.toLowerCase();
          if (!haystack.includes(term)) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [brands, search, statusFilter]);

  const allSelected = filtered.length > 0 && filtered.every((brand) => selectedIds.has(brand.id));

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
      setFormError('Informe o nome da marca.');
      return;
    }
    const slug = form.slug.trim() || slugify(name);

    setSaving(true);
    const result = editingId
      ? await api.updateBrand(editingId, {
          name,
          slug,
          description: form.description.trim() || null,
          website: form.website.trim() || null,
          active: form.active,
        })
      : await api.createBrand({
          name,
          slug,
          description: form.description.trim() || undefined,
          website: form.website.trim() || undefined,
          active: form.active,
        });
    setSaving(false);

    if (!result.ok) {
      setFormError(
        result.status === 409
          ? 'Já existe marca com este nome ou slug.'
          : result.status === 403
            ? 'Sua conta não tem permissão para alterar marcas.'
            : 'Não foi possível salvar a marca.',
      );
      return;
    }

    setFeedback({
      tone: 'success',
      message: editingId ? `Marca “${name}” atualizada.` : `Marca “${name}” criada.`,
    });
    setForm(EMPTY_FORM);
    setEditingId(null);
    void load();
  };

  const startEdit = (brand: Brand) => {
    setEditingId(brand.id);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? '',
      website: brand.website ?? '',
      active: brand.active,
    });
    setFormError(null);
    setFeedback(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);

    const result = await api.deleteBrand(deleteTarget.id);
    setDeleteBusy(false);

    if (!result.ok) {
      setDeleteError(
        result.status === 409
          ? 'Marca possui produtos vinculados — exclusão bloqueada pelo backend para preservar o catálogo.'
          : result.status === 404
            ? 'Marca não encontrada (pode já ter sido removida).'
            : 'Não foi possível excluir a marca.',
      );
      return;
    }

    setFeedback({ tone: 'success', message: `Marca “${deleteTarget.name}” removida.` });
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
    setSelectedIds(checked ? new Set(filtered.map((brand) => brand.id)) : new Set());
  };

  /** Ativa/desativa em lote reutilizando PATCH /brands/:id. */
  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const brand of brands) {
      if (!selectedIds.has(brand.id)) continue;
      const result = await api.updateBrand(brand.id, {
        name: brand.name,
        slug: brand.slug,
        description: brand.description ?? null,
        website: brand.website ?? null,
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
        `${successCount} marca(s) ${active ? 'ativada(s)' : 'inativada(s)'}.` +
        (failCount > 0 ? ` ${failCount} falhou(aram).` : ''),
    });
  };

  /** Exclui em lote; o backend bloqueia (409) marcas com produtos vinculados. */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setFeedback(null);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const result = await api.deleteBrand(id);
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
        `${successCount} marca(s) excluída(s).` +
        (failCount > 0
          ? ` ${failCount} não pôde(ram) ser excluída(s) por ter produtos vinculados.`
          : ''),
    });
  };

  if (!isAdmin) return null;

  return (
    <div>
      <AdminPageHeader
        backHref="/admin/dashboard"
        eyebrow="Catálogo"
        title="Marcas"
        description="Gerencie as marcas dos produtos, acompanhe os vínculos e mantenha os filtros do catálogo confiáveis."
        count={loading ? undefined : stats.total}
        countLabel={stats.total === 1 ? 'marca' : 'marcas'}
      />

      <AdminStatGrid>
        <AdminStatCard label="Total de marcas" value={stats.total} hint="Cadastradas no catálogo" />
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
              {selectedIds.size} marca(s) selecionada(s)
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
            title={editingId ? 'Editar marca' : 'Nova marca'}
            description={
              editingId
                ? 'Altere os dados e salve. Nome e slug precisam ser únicos.'
                : 'Cadastre uma marca para vincular aos produtos.'
            }
          >
            <div className="space-y-3">
              <div>
                <label htmlFor="brand-name" className={labelClassName}>
                  Nome *
                </label>
                <input
                  id="brand-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                      slug: editingId ? prev.slug : slugify(event.target.value),
                    }))
                  }
                  placeholder="Ex.: Lattafa"
                  className={inputClassName}
                  required
                />
              </div>

              <div>
                <label htmlFor="brand-slug" className={labelClassName}>
                  Slug
                </label>
                <input
                  id="brand-slug"
                  value={form.slug}
                  onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                  placeholder="Gerado a partir do nome"
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Endereço da marca na loja. Deixe em branco para gerar automaticamente.
                </p>
              </div>

              <div>
                <label htmlFor="brand-description" className={labelClassName}>
                  Descrição
                </label>
                <textarea
                  id="brand-description"
                  value={form.description}
                  onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Descrição opcional"
                  rows={3}
                  className={inputClassName}
                />
              </div>

              <div>
                <label htmlFor="brand-website" className={labelClassName}>
                  Website
                </label>
                <input
                  id="brand-website"
                  type="url"
                  value={form.website}
                  onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
                  placeholder="https://exemplo.com"
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-muted-foreground">Opcional.</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                  className="mt-0.5 rounded border-input"
                />
                <span>
                  <span className="block text-sm font-semibold text-foreground">Marca ativa</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Quando desmarcada, a marca não aparece na loja.
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
                {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar marca'}
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
                  placeholder="Buscar por nome, slug, descrição ou website"
                  aria-label="Buscar marcas"
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
                  'Carregando marcas...'
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{filtered.length}</span>{' '}
                    {filtered.length === 1 ? 'marca encontrada' : 'marcas encontradas'}
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
              <LoadingState message="Carregando marcas..." className="min-h-[220px]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-6">
              <EmptyState
                title={brands.length === 0 ? 'Nenhuma marca cadastrada' : 'Nenhuma marca encontrada'}
                description={
                  brands.length === 0
                    ? 'Crie a primeira marca no formulário ao lado.'
                    : 'Tente ajustar a busca ou o filtro de situação.'
                }
                action={
                  brands.length > 0 ? (
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
                  <table className="w-full min-w-[780px] text-sm">
                    <thead className="border-b border-border bg-muted/50 text-left">
                      <tr>
                        <th className="w-10 px-3 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(event) => toggleSelectAll(event.target.checked)}
                            aria-label="Selecionar todas as marcas visíveis"
                            className="rounded border-input"
                          />
                        </th>
                        <th className="px-3 py-3 font-semibold text-foreground">Nome</th>
                        <th className="px-3 py-3 font-semibold text-foreground">Slug</th>
                        <th className="px-3 py-3 font-semibold text-foreground">Produtos</th>
                        <th className="hidden px-3 py-3 font-semibold text-foreground xl:table-cell">
                          Website
                        </th>
                        <th className="px-3 py-3 font-semibold text-foreground">Status</th>
                        <th className="px-3 py-3 text-right font-semibold text-foreground">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((brand) => (
                        <tr
                          key={brand.id}
                          className={`border-b border-border transition-colors last:border-b-0 hover:bg-muted/30 ${
                            selectedIds.has(brand.id) ? 'bg-accent-soft/60' : ''
                          }`}
                        >
                          <td className="px-3 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(brand.id)}
                              onChange={(event) => toggleSelected(brand.id, event.target.checked)}
                              aria-label={`Selecionar ${brand.name}`}
                              className="mt-1 rounded border-input"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-medium text-foreground">{brand.name}</p>
                            {brand.description && (
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {brand.description}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-muted-foreground">
                            {brand.slug}
                          </td>
                          <td className="px-3 py-3 font-medium text-foreground">
                            {productCounts.get(brand.id) ?? 0}
                          </td>
                          <td className="hidden max-w-[220px] truncate px-3 py-3 text-xs xl:table-cell">
                            {brand.website ? (
                              <a
                                href={brand.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-accent hover:underline"
                              >
                                {brand.website}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={brand.active ? 'success' : 'muted'}>
                              {brand.active ? 'Ativa' : 'Inativa'}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEdit(brand)}
                                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteTarget(brand);
                                  setDeleteError(null);
                                }}
                                className="rounded-lg bg-error/10 px-2.5 py-1.5 text-xs font-semibold text-error transition-colors hover:bg-error/20"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cartões (até md) */}
              <div className="grid gap-3 md:hidden">
                {filtered.map((brand) => (
                  <article
                    key={brand.id}
                    className={`rounded-2xl border bg-card p-4 shadow-sm ${
                      selectedIds.has(brand.id) ? 'border-accent/50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(brand.id)}
                        onChange={(event) => toggleSelected(brand.id, event.target.checked)}
                        aria-label={`Selecionar ${brand.name}`}
                        className="mt-1 rounded border-input"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold leading-snug text-foreground">{brand.name}</p>
                            <p className="mt-0.5 break-all font-mono text-xs text-muted-foreground">
                              {brand.slug}
                            </p>
                          </div>
                          <StatusBadge tone={brand.active ? 'success' : 'muted'}>
                            {brand.active ? 'Ativa' : 'Inativa'}
                          </StatusBadge>
                        </div>

                        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                          <div>
                            <dt className="text-muted-foreground">Produtos</dt>
                            <dd className="mt-0.5 font-medium text-foreground">
                              {productCounts.get(brand.id) ?? 0}
                            </dd>
                          </div>
                          <div className="min-w-0">
                            <dt className="text-muted-foreground">Website</dt>
                            <dd className="mt-0.5 truncate font-medium text-foreground">
                              {brand.website ?? '—'}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 flex justify-end gap-1.5 border-t border-border pt-3">
                          <button
                            type="button"
                            onClick={() => startEdit(brand)}
                            className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteTarget(brand);
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
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Excluir marca?"
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
                O backend bloqueia a exclusão se houver produtos vinculados. Nesse caso, a marca é
                preservada.
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
        title={`Excluir ${selectedIds.size} marca(s)?`}
        description="Marcas com produtos vinculados são preservadas pelo backend e não serão excluídas."
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
