'use client';

// Contexto global do carrinho.
//
// Responsabilidades:
//  - Observar a sessão ('auth_session') e (re)carregar o carrinho do usuário.
//  - Expor loading / error / resultado por operação para a UI reagir.
//  - Nunca enviar userId, cartId, price ou product ao backend (ver lib/api.ts).
//
// O token é lido dinamicamente (authManager.getToken() → fallback localStorage)
// no momento de cada requisição; capturá-lo no escopo do render deixava o
// carrinho permanentemente vazio no primeiro paint do client.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  ReactNode,
} from 'react';
import { Cart, CartMutationResult } from '@/lib/types';
import { api } from '@/lib/api';
import { authManager, hydrateSessionFromStorage, readStoredToken } from '@/lib/auth';
import { clearCartStorage, readCartStorage, writeCartStorage } from '@/lib/cart-storage';

type Status = 'idle' | 'loading' | 'success' | 'error';

type State = {
  cart: Cart | null;
  status: Status;
  /** Erro do carregamento (GET /cart) */
  error: string | null;
  /** Erro da última operação de escrita (add/update/remove/clear) */
  mutationError: string | null;
  loading: boolean;
  updating: boolean;
  initialized: boolean;
  authenticated: boolean;
};

type Action =
  | { type: 'AUTH'; authenticated: boolean }
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; cart: Cart }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'MUTATE_START' }
  | { type: 'MUTATE_ERROR'; error: string | null }
  | { type: 'MUTATE_END' }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'AUTH':
      return { ...state, authenticated: action.authenticated };
    case 'LOAD_START':
      return { ...state, status: 'loading', loading: true, error: null };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        cart: action.cart,
        status: 'success',
        loading: false,
        error: null,
        initialized: true,
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        status: 'error',
        loading: false,
        error: action.error,
        initialized: true,
      };
    case 'MUTATE_START':
      return { ...state, updating: true, mutationError: null };
    case 'MUTATE_ERROR':
      return { ...state, mutationError: action.error };
    case 'MUTATE_END':
      return { ...state, updating: false };
    case 'RESET':
      return { ...initialState, authenticated: state.authenticated, initialized: true };
    default:
      return state;
  }
}

const initialState: State = {
  cart: null,
  status: 'idle',
  error: null,
  mutationError: null,
  loading: false,
  updating: false,
  initialized: false,
  authenticated: false,
};

/** Mensagem amigável por status HTTP (o backend responde 400/401/404). */
function messageForStatus(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return 'Quantidade indisponível em estoque.';
    case 401:
    case 403:
      return 'Sua sessão expirou. Entre novamente para continuar.';
    case 404:
      return 'Item não encontrado no carrinho.';
    case 0:
      return 'Não foi possível falar com o servidor. Verifique sua conexão.';
    default:
      return fallback;
  }
}

export interface CartOperationResult {
  success: boolean;
  error?: string;
}

interface CartContextValue extends State {
  /** Unidades totais (badge do header) */
  itemCount: number;
  /** Quantidade do produto no carrinho (0 quando ausente) */
  getItemQuantity: (productId: string) => number;
  /** Preço unitário praticado no carrinho (validado pelo backend) */
  getItemPrice: (productId: string) => number | null;
  addItem: (productId: string, quantity?: number) => Promise<CartOperationResult>;
  updateItem: (productId: string, quantity: number) => Promise<CartOperationResult>;
  removeItem: (productId: string) => Promise<CartOperationResult>;
  clearCart: () => Promise<CartOperationResult>;
  refresh: () => Promise<CartOperationResult>;
  /** Limpa as mensagens de erro exibidas na UI */
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Evita respostas fora de ordem (ex.: refresh durante uma mutação).
  const loadIdRef = useRef(0);
  const mountedRef = useRef(false);

  const load = useCallback(
    async (options: { force?: boolean } = {}): Promise<CartOperationResult> => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        clearCartStorage();
        dispatch({ type: 'RESET' });
        return { success: true };
      }

      // O cache local evita piscar "carrinho vazio" enquanto o GET não responde.
      if (!options.force) {
        const cached = readCartStorage();
        if (cached) {
          dispatch({ type: 'LOAD_SUCCESS', cart: cached });
          return { success: true };
        }
      }

      const loadId = ++loadIdRef.current;
      dispatch({ type: 'LOAD_START' });

      const result = await api.getCart(token);
      // Uma requisição mais recente já foi disparada.
      if (loadId !== loadIdRef.current) return { success: true };

      if (result.ok) {
        writeCartStorage(result.cart);
        dispatch({ type: 'LOAD_SUCCESS', cart: result.cart });
        return { success: true };
      }

      if (result.status === 401 || result.status === 403) {
        clearCartStorage();
        dispatch({ type: 'RESET' });
        return { success: false, error: messageForStatus(result.status, 'Sessão inválida.') };
      }

      const error = result.message
        ?? messageForStatus(result.status, 'Não foi possível carregar seu carrinho. Tente novamente.');
      dispatch({ type: 'LOAD_ERROR', error });
      return { success: false, error };
    },
    [],
  );

  // Hidrata a sessão do localStorage no mount: o singleton de auth.ts pode ter
  // sido criado durante o SSR, quando `window` ainda não existia.
  useEffect(() => {
    mountedRef.current = true;
    hydrateSessionFromStorage();

    const unsubscribe = authManager.subscribe(() => {
      if (authManager.isAuthenticated()) {
        void load({ force: true });
      } else {
        clearCartStorage();
        dispatch({ type: 'RESET' });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [load]);

  // Carrega o carrinho assim que houver sessão autenticada.
  useEffect(() => {
    const authenticated = authManager.isAuthenticated();
    dispatch({ type: 'AUTH', authenticated });

    if (authenticated) {
      void load();
    } else {
      clearCartStorage();
      dispatch({ type: 'RESET' });
    }
  }, [load]);

  /**
   * Executa uma operação de escrita e sincroniza o estado com a resposta.
   * O token é resolvido a cada chamada; o corpo enviado ao backend contém
   * apenas productId/quantity. `setQuantity` recebe a quantidade ALVO.
   */
  const mutate = useCallback(
    async (
      operation: (token: string) => Promise<CartMutationResult>,
      fallbackError: string,
    ): Promise<CartOperationResult> => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        const error = 'Você precisa estar logado para usar o carrinho.';
        dispatch({ type: 'MUTATE_ERROR', error });
        return { success: false, error };
      }

      dispatch({ type: 'MUTATE_START' });

      try {
        const result = await operation(token);

        if (!result.ok) {
          if (result.status === 401 || result.status === 403) {
            // Sessão caiu durante a operação: invalida estado e cache.
            authManager.logout();
            clearCartStorage();
            dispatch({ type: 'RESET' });
          }
          const error = result.message ?? messageForStatus(result.status, fallbackError);
          dispatch({ type: 'MUTATE_ERROR', error });
          return { success: false, error };
        }

        writeCartStorage(result.cart);
        dispatch({ type: 'LOAD_SUCCESS', cart: result.cart });
        dispatch({ type: 'MUTATE_ERROR', error: null });
        return { success: true };
      } catch {
        dispatch({ type: 'MUTATE_ERROR', error: fallbackError });
        return { success: false, error: fallbackError };
      } finally {
        if (mountedRef.current) dispatch({ type: 'MUTATE_END' });
      }
    },
    [],
  );

  const addItem = useCallback(
    (productId: string, quantity = 1) =>
      mutate(
        (token) => api.addToCart(productId, quantity, token),
        'Não foi possível adicionar o produto ao carrinho.',
      ),
    [mutate],
  );

  const updateItem = useCallback(
    (productId: string, quantity: number) =>
      mutate(
        (token) => api.updateCartItem(productId, quantity, token),
        'Não foi possível atualizar a quantidade.',
      ),
    [mutate],
  );

  const removeItem = useCallback(
    (productId: string) =>
      mutate((token) => api.removeCartItem(productId, token), 'Não foi possível remover o item.'),
    [mutate],
  );

  const clearCart = useCallback(
    () => mutate((token) => api.clearCart(token), 'Não foi possível limpar o carrinho.'),
    [mutate],
  );

  const refresh = useCallback(() => load({ force: true }), [load]);

  const clearError = useCallback(() => {
    dispatch({ type: 'MUTATE_ERROR', error: null });
  }, []);

  const items = useMemo(() => state.cart?.items ?? [], [state.cart]);

  const getItemQuantity = useCallback(
    (productId: string) => items.find((item) => item.productId === productId)?.quantity ?? 0,
    [items],
  );

  const getItemPrice = useCallback(
    (productId: string) => {
      const raw = items.find((item) => item.productId === productId)?.price;
      if (raw === null || raw === undefined) return null;
      const price = typeof raw === 'number' ? raw : Number.parseFloat(raw);
      return Number.isFinite(price) ? price : null;
    },
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      ...state,
      itemCount: state.cart?.totalItems ?? 0,
      getItemQuantity,
      getItemPrice,
      addItem,
      updateItem,
      removeItem,
      clearCart,
      refresh,
      clearError,
    }),
    [state, getItemQuantity, getItemPrice, addItem, updateItem, removeItem, clearCart, refresh, clearError],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart deve ser usado dentro de <CartProvider>');
  }
  return context;
}
