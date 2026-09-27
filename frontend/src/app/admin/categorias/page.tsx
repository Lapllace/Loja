'use client';

/**
 * Catálogo → Categorias.
 * Reutiliza exatamente os endpoints existentes:
 *   GET/POST /categories, PATCH/DELETE /categories/:id
 *
 * O backend recusa exclusão de categoria com subcategorias ou produtos
 * vinculados (409) — a UI apenas reporta o erro, sem tentar contornar.
 */

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { Category } from '@/lib/types';

interface FormState {
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

const EMPTY_FORM: FormState = { name: '', slug: '', description: '', active: true };

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function AdminCategoriesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    const data = await api.getCategories({ next: { revalidate: 0 } });
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    api.getCategories({ next: { revalidate: 0 } }).then((data) => {
      if (!active) return;
      setCategories(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const name = form.name.trim();
    if (!name) {
      setError('Informe o nome da categoria.');
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
      setError(
        result.status === 409
          ? 'Já existe categoria com este nome ou slug.'
          : 'Não foi possível salvar a categoria.',
      );
      return;
    }

    setNotice(editingId ? 'Categoria atualizada.' : 'Categoria criada.');
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
    setError(null);
    setNotice(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await api.deleteCategory(deleteTarget.id);
    if (!result.ok) {
      setError(
        result.status === 409
          ? 'Categoria possui subcategorias ou produtos vinculados — exclusão bloqueada pelo backend.'
          : 'Não foi possível excluir a categoria.',
      );
      setDeleteTarget(null);
      return;
    }
    setDeleteTarget(null);
    setNotice('Categoria removida.');
    void load();
  };

  if (!isAdmin) return null;

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Catálogo</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Categorias</h1>
      <p className="mt-2 text-muted-foreground">Organize as categorias da loja.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Formulário */}
        <form onSubmit={handleSubmit} className="h-fit rounded-xl border-border bg-card p-5">
          <h2 className="text-lg font-bold text-foreground">
            {editingId ? 'Editar categoria' : 'Nova categoria'}
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
              placeholder="Slug (gerado a partir do nome)"
              className="w-full rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Descrição (opcional)"
              rows={3}
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

        {/* Listagem */}
        <div>
          {loading ? (
            <LoadingState message="Carregando categorias..." className="min-h-[200px]" />
          ) : categories.length === 0 ? (
            <div className="rounded-xl border-border bg-muted/30 p-8 text-center text-muted-foreground">
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Nome</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Slug</th>
                    <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="border-b border-border">
                      <td className="px-4 py-3 text-foreground">{category.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{category.slug}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            category.active
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {category.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="rounded-lg border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(category)}
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
            <h2 className="text-lg font-bold text-foreground">Excluir categoria?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              A categoria <span className="font-medium text-foreground">{deleteTarget.name}</span> será
              removida. O backend bloqueia a exclusão se houver subcategorias ou produtos vinculados.
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
