'use client';

/**
 * Catálogo → Marcas.
 * Reutiliza exatamente os endpoints existentes:
 *   GET/POST /brands, PATCH/DELETE /brands/:id
 * O backend recusa exclusão de marca com produtos vinculados (409).
 */

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Brand } from '@/lib/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  website: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', website: '', active: true };

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminBrandsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  // Ações em lote (sem endpoint bulk no backend: percorremos os IDs
  // selecionados com os endpoints PATCH/DELETE existentes).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getBrands({ next: { revalidate: 0 } });
    setBrands(data);
    // A lista foi refeita: manter seleção de itens que não existem mais confunde.
    setSelectedIds(new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [isAdmin, load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const name = form.name.trim();
    if (!name) {
      setError('Informe o nome da marca.');
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
      setError(
        result.status === 409
          ? 'Já existe marca com este nome ou slug.'
          : 'Não foi possível salvar a marca.',
      );
      return;
    }

    setNotice(editingId ? 'Marca atualizada.' : 'Marca criada.');
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
    setError(null);
    setNotice(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await api.deleteBrand(deleteTarget.id);
    if (!result.ok) {
      setError(
        result.status === 409
          ? 'Marca possui produtos vinculados — exclusão bloqueada pelo backend.'
          : 'Não foi possível excluir a marca.',
      );
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    setNotice('Marca removida.');
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

  const allSelected = brands.length > 0 && selectedIds.size === brands.length;

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(brands.map((brand) => brand.id)) : new Set());
  };

  /** Ativa/desativa em lote reutilizando PATCH /brands/:id. */
  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    setError(null);
    setNotice(null);

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
    setNotice(
      `${successCount} marca(s) ${active ? 'ativada(s)' : 'inativada(s)'}.` +
        (failCount > 0 ? ` ${failCount} falharam.` : ''),
    );
  };

  /** Exclui em lote; o backend bloqueia (409) marcas com produtos vinculados. */
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(
      `Excluir ${selectedIds.size} marca(s)? Marcas com produtos vinculados serão preservadas.`,
    );
    if (!confirmed) return;

    setBulkBusy(true);
    setError(null);
    setNotice(null);

    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      const result = await api.deleteBrand(id);
      if (result.ok) successCount += 1;
      else failCount += 1;
    }

    setBulkBusy(false);
    setSelectedIds(new Set());
    await load();
    setNotice(`${successCount} marca(s) excluída(s).`);
    if (failCount > 0) {
      setError(
        `${failCount} marca(s) não puderam ser excluídas (possuem produtos vinculados).`,
      );
    }
  };

  if (!isAdmin) return null;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Catálogo</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Marcas</h1>
      <p className="mt-2 text-muted-foreground">Gerencie as marcas dos produtos.</p>

      {/* Ações em lote */}
      {selectedIds.size > 0 && (
        <div className="mt-6 rounded-xl border-border bg-accent/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.size} marca(s) selecionada(s)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleBulkActive(true)}
                disabled={bulkBusy}
                className="rounded-lg border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                Ativar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkActive(false)}
                disabled={bulkBusy}
                className="rounded-lg border-border bg-background px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                Desativar
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDelete()}
                disabled={bulkBusy}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-60"
              >
                {bulkBusy ? 'Processando...' : 'Excluir selecionadas'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                disabled={bulkBusy}
                className="rounded-lg border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                Limpar seleção
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <form onSubmit={handleSubmit} className="h-fit rounded-xl border-border bg-card p-5">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? 'Editar marca' : 'Nova marca'}
          </h2>
          <div className="mt-4 space-y-3">
            <input
              value={form.name}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                  slug: editingId ? prev.slug : slugify(e.target.value),
                }))
              }
              placeholder="Nome"
              className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
              placeholder="Slug"
              className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              rows={3}
              className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="Website (opcional)"
              className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              Ativa
            </label>
          </div>

          {error && (
            <div role="alert" className="mt-4 rounded-lg border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-4 rounded-lg border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {notice}
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-ink hover:bg-accent-dark disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar' : 'Criar'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="rounded-lg border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div>
          {loading ? (
            <LoadingState message="Carregando marcas..." className="min-h-[200px]" />
          ) : brands.length === 0 ? (
            <div className="rounded-xl border-border bg-muted/30 p-8 text-center text-muted-foreground">
              Nenhuma marca cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="w-10 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        aria-label="Selecionar todas as marcas"
                        className="rounded border-input"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Slug</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr key={brand.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(brand.id)}
                          onChange={(e) => toggleSelected(brand.id, e.target.checked)}
                          aria-label={`Selecionar ${brand.name}`}
                          className="rounded border-input"
                        />
                      </td>
                      <td className="px-4 py-3 text-foreground">{brand.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{brand.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            brand.active
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {brand.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(brand)}
                            className="rounded-lg border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(brand)}
                            className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/20"
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
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setDeleteTarget(null)}
            className="absolute inset-0 bg-black/50"
          />
          <div className="relative w-full max-w-md rounded-2xl border-border bg-background p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Excluir marca?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A marca <span className="font-medium text-foreground">{deleteTarget.name}</span> será
              removida. O backend bloqueia a exclusão se houver produtos vinculados.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
