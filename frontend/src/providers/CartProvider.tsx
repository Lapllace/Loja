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
import { Cart, CartItem, CartMutationResult, Product } from '@/lib/types';
import { api } from '@/lib/api';
import { authManager, hydrateSessionFromStorage, readStoredToken } from '@/lib/auth';
import {
  clearCartStorage,
  readCartStorage,
  writeCartStorage,
  readGuestCart,
  writeGuestCart,
  clearGuestCart,
  type GuestCartItem,
} from '@/lib/cart-storage';
import { toNumber } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'success' | 'error';

/**
 * Resultado da consulta de um produto do carrinho de convidado.
 *
 * - `missing`: o produto não existe mais (404) → o item é descartado;
 * - `unavailable`: a API não respondeu (rede/timeout/5xx) → o item é mantido
 *   sem preço, em vez de apagar dados do visitante;
 * - `ok`: produto carregado, pronto para hidratar nome/imagem/preço/estoque.
 */
type GuestProductLookup =
  | { status: 'ok'; product: Product }
  | { status: 'missing' }
  | { status: 'unavailable' };

/**
 * Cache em memória dos produtos usados para hidratar o carrinho de convidado.
 * Evita repetir `GET /products/:id` a cada render/abertura da gaveta. É
 * limpo em `refresh()`/clear e nunca guarda falhas de rede.
 */
const guestProductCache = new Map<string, GuestProductLookup>();

async function lookupGuestProduct(productId: string, fresh = false): Promise<GuestProductLookup> {
  if (!fresh) {
    const cached = guestProductCache.get(productId);
    if (cached) return cached;
  }

  try {
    const product = await api.getProductById(productId, { next: { revalidate: 0 } });
    const result: GuestProductLookup = product ? { status: 'ok', product } : { status: 'missing' };
    guestProductCache.set(productId, result);
    return result;
  } catch {
    // API indisponível: não descarta o item nem reescreve o storage.
    return { status: 'unavailable' };
  }
}

/**
 * Monta o carrinho visível do visitante.
 *
 * O localStorage guarda apenas `{ productId, quantity }`; nome, imagem, preço e
 * estoque vêm SEMPRE do backend (`GET /products/:id`, rota pública). Assim a
 * lista e o total aparecem corretos sem exigir login — e nenhum preço é
 * inventado no cliente.
 */
async function buildGuestCart(items: GuestCartItem[]): Promise<Cart> {
  const hydrated: CartItem[] = [];
  const kept: GuestCartItem[] = [];

  for (const item of items) {
    const lookup = await lookupGuestProduct(item.productId);

    if (lookup.status === 'missing') continue;

    if (lookup.status === 'unavailable') {
      kept.push(item);
      hydrated.push({
        id: `guest-${item.productId}`,
        productId: item.productId,
        quantity: item.quantity,
      });
      continue;
    }

    const product = lookup.product;
    const quantity = Math.max(1, Math.min(item.quantity, Math.max(product.stock, 1)));

    kept.push({ productId: item.productId, quantity });
    hydrated.push({
      id: `guest-${product.id}`,
      productId: product.id,
      quantity,
      name: product.name,
      imageUrl: product.images?.[0]?.url ?? null,
      price: product.price,
      product,
    });
  }

  const changed =
    kept.length !== items.length ||
    kept.some((item, index) => item.quantity !== items[index]?.quantity);
  if (changed) writeGuestCart(kept);

  const totalItems = hydrated.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = hydrated.reduce((sum, item) => {
    const unitPrice = toNumber(item.price) ?? 0;
    return sum + unitPrice * item.quantity;
  }, 0);

  return { items: hydrated, totalItems, totalAmount };
}

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
      return 'Sua sessão expirou. Entre novamente para continuar.';
    case 403:
      return 'Sua conta não tem permissão para alterar o carrinho.';
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
      // Toda chamada de load invalida as anteriores — inclusive a do visitante.
      const loadId = ++loadIdRef.current;

      if (!token) {
        // Visitante: o carrinho vive no localStorage e é hidratado pelo backend
        // (nome, imagem, preço e estoque) para que a lista e o total apareçam
        // imediatamente, sem exigir login.
        clearCartStorage();
        if (options.force) guestProductCache.clear();
        const guestCart = await buildGuestCart(readGuestCart());
        if (loadId !== loadIdRef.current) return { success: true };
        dispatch({ type: 'LOAD_SUCCESS', cart: guestCart });
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

  // Callback para mesclar carrinho de convidado ao fazer login
  const mergeGuestCart = useCallback(async (token: string) => {
    const guestItems = readGuestCart();
    if (guestItems.length === 0) return;

    const failedItems: GuestCartItem[] = [];
    for (const item of guestItems) {
      try {
        const result = await api.addToCart(item.productId, item.quantity, token);
        if (!result.ok) {
          failedItems.push(item);
        }
      } catch {
        failedItems.push(item);
      }
    }

    if (failedItems.length === 0) {
      clearGuestCart();
    } else {
      writeGuestCart(failedItems);
    }
    guestProductCache.clear();
    await load({ force: true });
  }, [load]);

  // Registrar callback pós-login para fusão do carrinho
  useEffect(() => {
    const unsubscribe = authManager.onPostLogin(async () => {
      const token = authManager.getToken();
      if (token) {
        await mergeGuestCart(token);
      }
    });
    return unsubscribe;
  }, [mergeGuestCart]);

  // Hidrata a sessão do localStorage no mount: o singleton de auth.ts pode ter
  // sido criado durante o SSR, quando `window` ainda não existia.
  useEffect(() => {
    mountedRef.current = true;
    hydrateSessionFromStorage();

    const unsubscribe = authManager.subscribe(() => {
      if (authManager.isAuthenticated()) {
        void load({ force: true });
      } else {
        // Logout: descarta o cache autenticado e volta a exibir o carrinho de
        // convidado hidratado (mesmo vazio), em vez de simplesmente sumir.
        clearCartStorage();
        void load({ force: true });
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [load]);

  // Carrega o carrinho no primeiro render do client: autenticado (GET /cart) ou
  // visitante (localStorage hidratado pelo backend). Sem isto, o carrinho do
  // visitante só apareceria depois de uma nova ação — nunca no reload.
  useEffect(() => {
    const authenticated = authManager.isAuthenticated();
    dispatch({ type: 'AUTH', authenticated });
    void load();
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
    async (productId: string, quantity = 1) => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        // Visitante: só adiciona depois de confirmar existência e estoque no
        // backend (não existe carrinho server-side sem token).
        const lookup = await lookupGuestProduct(productId, true);
        if (lookup.status !== 'ok') {
          const error =
            lookup.status === 'missing'
              ? 'Produto indisponível.'
              : 'Não foi possível validar o produto agora.';
          dispatch({ type: 'MUTATE_ERROR', error });
          return { success: false, error };
        }

        const guestItems = readGuestCart();
        const existing = guestItems.find((item) => item.productId === productId);
        const desired = (existing?.quantity ?? 0) + quantity;

        if (lookup.product.stock <= 0 || desired > lookup.product.stock) {
          const error = 'Quantidade indisponível em estoque.';
          dispatch({ type: 'MUTATE_ERROR', error });
          return { success: false, error };
        }

        const updated = existing
          ? guestItems.map((item) =>
              item.productId === productId ? { ...item, quantity: desired } : item,
            )
          : [...guestItems, { productId, quantity: desired }];

        writeGuestCart(updated);
        dispatch({ type: 'LOAD_SUCCESS', cart: await buildGuestCart(updated) });
        return { success: true };
      }

      return mutate(
        (token) => api.addToCart(productId, quantity, token),
        'Não foi possível adicionar o produto ao carrinho.',
      );
    },
    [mutate],
  );

  const updateItem = useCallback(
    async (productId: string, quantity: number) => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        const lookup = await lookupGuestProduct(productId, true);
        if (lookup.status === 'ok' && quantity > lookup.product.stock) {
          const error = 'Quantidade indisponível em estoque.';
          dispatch({ type: 'MUTATE_ERROR', error });
          return { success: false, error };
        }

        const guestItems = readGuestCart();
        const updated = guestItems.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        );
        writeGuestCart(updated);
        dispatch({ type: 'LOAD_SUCCESS', cart: await buildGuestCart(updated) });
        return { success: true };
      }

      return mutate(
        (token) => api.updateCartItem(productId, quantity, token),
        'Não foi possível atualizar a quantidade.',
      );
    },
    [mutate],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        const updated = readGuestCart().filter((item) => item.productId !== productId);
        writeGuestCart(updated);
        dispatch({ type: 'LOAD_SUCCESS', cart: await buildGuestCart(updated) });
        return { success: true };
      }

      return mutate((token) => api.removeCartItem(productId, token), 'Não foi possível remover o item.');
    },
    [mutate],
  );

  const clearCart = useCallback(
    () => {
      const token = authManager.getToken() ?? readStoredToken();

      if (!token) {
        clearGuestCart();
        guestProductCache.clear();
        dispatch({ type: 'RESET' });
        return Promise.resolve({ success: true });
      }

      return mutate((token) => api.clearCart(token), 'Não foi possível limpar o carrinho.');
    },
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
