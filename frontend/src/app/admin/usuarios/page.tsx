'use client';

/**
 * Clientes → Usuários.
 *
 * Backend auditado (users.controller.ts):
 *  - GET /users — @Roles(ADMIN) (hierarquia: ADMIN e OWNER acessam).
 *  - PATCH /users/:id/role-status — ADMIN só pode mudar status (não elevar
 *    para ADMIN/OWNER); OWNER pode alterar role e status.
 *  - DELETE /users/:id — ADMIN só exclui CUSTOMER; OWNER exclui qualquer um.
 *
 * A UI expõe alteração de STATUS para ADMIN/OWNER e alteração de ROLE apenas
 * para OWNER (o backend rejeita 403 caso contrário).
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { LoadingState } from '@/components/ui/LoadingState';
import type { AdminUser } from '@/lib/types';

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Cliente',
  ADMIN: 'Administrador',
  OWNER: 'Proprietário',
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'OWNER';
  const isOwner = currentUser?.role === 'OWNER';

  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const load = useCallback(async () => {
    const result = await api.getUsers({ next: { revalidate: 0 } });
    if (result.ok) setUsers(result.data);
    else setError('Não foi possível carregar os usuários.');
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    api.getUsers({ next: { revalidate: 0 } }).then((result) => {
      if (!active) return;
      if (result.ok) {
        setUsers(result.data);
        setError(null);
      } else {
        setError('Não foi possível carregar os usuários.');
      }
    });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  const handleStatusChange = async (target: AdminUser, status: string) => {
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    const result = await api.updateUserRoleStatus(target.id, { status });
    setBusyId(null);
    if (!result.ok) {
      setError('Não foi possível atualizar o status (verifique suas permissões).');
      return;
    }
    setNotice('Status atualizado.');
    void load();
  };

  const handleRoleChange = async (target: AdminUser, role: string) => {
    setBusyId(target.id);
    setError(null);
    setNotice(null);
    const result = await api.updateUserRoleStatus(target.id, { role });
    setBusyId(null);
    if (!result.ok) {
      setError('Somente o OWNER pode alterar a role de um usuário.');
      return;
    }
    setNotice('Role atualizada.');
    void load();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    const result = await api.deleteUser(deleteTarget.id);
    setBusyId(null);
    setDeleteTarget(null);
    if (!result.ok) {
      setError('Não foi possível excluir o usuário (verifique as regras de role).');
      return;
    }
    setNotice('Usuário removido.');
    void load();
  };

  if (!isAdmin) return null;

  const filtered = (users ?? []).filter((target) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return `${target.name} ${target.email} ${target.cpf ?? ''}`.toLowerCase().includes(term);
  });

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Clientes</p>
      <h1 className="mt-2 text-3xl font-bold text-foreground">Usuários</h1>
      <p className="mt-2 text-muted-foreground">
        Gerencie status e permissões. Hierarquia: CUSTOMER {'<'} ADMIN {'<'} OWNER.
      </p>

      {error && (
        <div role="alert" className="mt-4 rounded-lg border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}
      {notice && (
        <div className="mt-4 rounded-lg border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      )}

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nome, email ou CPF"
        className="mt-6 w-full max-w-sm rounded-lg border-input bg-background px-3 py-2 text-sm text-foreground"
      />

      <div className="mt-6">
        {users === null ? (
          <LoadingState message="Carregando usuários..." className="min-h-[200px]" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border-border bg-muted/30 p-8 text-center text-muted-foreground">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((target) => (
                  <tr key={target.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{target.name}</p>
                      <p className="text-xs text-muted-foreground">{target.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      {isOwner ? (
                        <select
                          value={target.role}
                          disabled={busyId === target.id}
                          onChange={(e) => handleRoleChange(target, e.target.value)}
                          className="rounded-lg border-input bg-background px-2 py-1.5 text-xs text-foreground"
                          aria-label={`Role de ${target.name}`}
                        >
                          <option value="CUSTOMER">Cliente</option>
                          <option value="ADMIN">Administrador</option>
                          <option value="OWNER">Proprietário</option>
                        </select>
                      ) : (
                        <span className="text-muted-foreground">{ROLE_LABELS[target.role]}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={target.status}
                        disabled={busyId === target.id}
                        onChange={(e) => handleStatusChange(target, e.target.value)}
                        className="rounded-lg border-input bg-background px-2 py-1.5 text-xs text-foreground"
                        aria-label={`Status de ${target.name}`}
                      >
                        <option value="ACTIVE">Ativo</option>
                        <option value="PENDING">Pendente</option>
                        <option value="BLOCKED">Bloqueado</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(target)}
                        className="rounded-lg bg-error/10 px-3 py-1.5 text-xs font-semibold text-error hover:bg-error/20"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
            <h2 className="text-lg font-bold text-foreground">Excluir usuário?</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{deleteTarget.name}</span> ({deleteTarget.email})
              será removido permanentemente. O backend permite: ADMIN pode excluir apenas CUSTOMER;
              OWNER pode excluir qualquer usuário.
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
                disabled={busyId === deleteTarget.id}
                className="rounded-lg bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90 disabled:opacity-60"
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
