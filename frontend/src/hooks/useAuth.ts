'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { authManager } from '@/lib/auth';
import { Session } from '@/lib/types';

/**
 * Estado de autenticação lido do `authManager` (singleton que persiste em
 * localStorage).
 *
 * Usa `useSyncExternalStore` porque esta é exatamente a situação para a qual
 * ele existe: o valor difere entre servidor e cliente. O `getServerSnapshot`
 * devolve SEMPRE o estado "deslogado", garantindo que a primeira renderização
 * do cliente seja idêntica à do servidor (sem hydration mismatch). Após a
 * hidratação o React re-lê o snapshot real do cliente.
 *
 * Importante: `null` é um snapshot AMBÍGUO — significa tanto "sessão ainda não
 * hidratada" quanto "usuário deslogado". Por isso o snapshot inclui um flag
 * `hydrated`, que distingue os dois casos e evita que a UI fique presa em
 * "Carregando..." para sempre quando não há sessão alguma.
 */

interface AuthSnapshot {
  session: Session | null;
  /** `true` quando o localStorage já foi lido (somente no cliente). */
  hydrated: boolean;
}

// Snapshot do servidor: referência constante (o React exige estabilidade no SSR).
const SERVER_SNAPSHOT: AuthSnapshot = { session: null, hydrated: false };

// Cache do cliente. Guardamos a REFERÊNCIA estável enquanto o conteúdo não muda,
// mas o flag `hydrated` faz parte do cache — e não a comparação só da sessão.
let cachedSession: Session | null = null;
let cachedSnapshot: AuthSnapshot = SERVER_SNAPSHOT;

function readClientSnapshot(): AuthSnapshot {
  const session = authManager.getSession();

  // Sem mudança real: devolve a MESMA referência (evita loop de render).
  if (cachedSnapshot.hydrated && session === cachedSession) {
    return cachedSnapshot;
  }

  // Primeira leitura no cliente (ou sessão alterada): marca como hidratado.
  // Isto acontece mesmo quando `session` é `null` — que é justamente o caso
  // do visitante deslogado, que antes ficava preso em "Carregando...".
  cachedSession = session;
  cachedSnapshot = { session, hydrated: true };
  return cachedSnapshot;
}

function subscribe(onStoreChange: () => void): () => void {
  // Relê o storage e notifica, para que o estado inicial do servidor
  // (sempre "deslogado") seja reconciliado com a realidade do browser —
  // inclusive quando NÃO há sessão.
  authManager.reloadSession();
  onStoreChange();
  return authManager.subscribe(() => onStoreChange());
}

function getServerSnapshot(): AuthSnapshot {
  return SERVER_SNAPSHOT;
}

export function useAuth() {
  const snapshot = useSyncExternalStore(
    subscribe,
    readClientSnapshot,
    getServerSnapshot,
  );
  const { session, hydrated } = snapshot;

  const login = useCallback(
    async (email: string, password: string, rememberMe = true) => {
      const result = await authManager.login(email, password, rememberMe);
      return result;
    },
    [],
  );

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      cpf?: string;
    }) => {
      const result = await authManager.register(data);
      return result;
    },
    [],
  );

  const logout = useCallback(() => {
    authManager.logout();
  }, []);

  const refresh = useCallback(async () => {
    await authManager.refreshSession();
  }, []);

  // No servidor e na primeira renderização do cliente `hydrated` é `false`, então
  // ambos produzem a mesma árvore (sem mismatch). Assim que o storage é lido, o
  // loading termina — COM ou SEM sessão. Nunca fica preso.
  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: session !== null && session.user.status !== 'BLOCKED',
    /**
     * `true` apenas enquanto não sabemos se há sessão (SSR / pré-hidratação).
     * Depois disso é sempre `false`, mesmo para visitantes deslogados.
     */
    loading: !hydrated,
    login,
    register,
    logout,
    refresh,
  };
}
