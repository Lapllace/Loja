import { Session, User } from './types';
import { ApiHttpError, api } from './api';
import { SESSION_STORAGE_KEY } from './constants';

/** Exportado para eventuais consumidores; o valor canônico vive em constants.ts. */
export const SESSION_KEY = SESSION_STORAGE_KEY;

type PostLoginCallback = () => void | Promise<void>;

/**
 * Lê o accessToken direto do localStorage ('auth_session').
 * Útil como fallback quando o singleton ainda não hidratou a sessão em memória
 * (ex.: primeira renderização no client, outra aba, ou storage alterado).
 */
export function readStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
      ?? window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const token = (parsed as { token?: unknown; accessToken?: unknown }).token
      ?? (parsed as { accessToken?: unknown }).accessToken;
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

/**
 * Recarrega a sessão a partir do localStorage. O singleton é criado no import
 * deste módulo, quando `window` ainda pode ser indefinido (SSR/bundle inicial);
 * chamar isto no mount do client evita ficar "logado só depois do reload".
 */
export function hydrateSessionFromStorage(): void {
  authManager.reloadSession();
}

export class AuthManager {
  private session: Session | null = null;
  private storage: 'local' | 'session' = 'local';
  private listeners: Set<(session: Session | null) => void> = new Set();
  private postLoginCallbacks: Set<PostLoginCallback> = new Set();

  constructor() {
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(SESSION_KEY)
        ?? sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        this.storage = localStorage.getItem(SESSION_KEY) ? 'local' : 'session';
        this.session = JSON.parse(stored);
        this.validateSession();
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      this.session = null;
      this.saveSession();
    }
  }

  private saveSession(): void {
    if (typeof window === 'undefined') return;

    try {
      if (this.session) {
        const serialized = JSON.stringify(this.session);
        const target = this.storage === 'local' ? localStorage : sessionStorage;
        target.setItem(SESSION_KEY, serialized);
        const other = this.storage === 'local' ? sessionStorage : localStorage;
        other.removeItem(SESSION_KEY);
      } else {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private async validateSession(): Promise<void> {
    if (!this.session) return;

    try {
      const user = await api.getMe(this.session.token);
      if (user) {
        this.session.user = user;
        this.saveSession();
        this.notifyListeners();
      } else {
        this.session = null;
        this.saveSession();
        this.notifyListeners();
      }
    } catch (error) {
      if (error instanceof ApiHttpError && (error.status === 401 || error.status === 403)) {
        this.session = null;
        this.saveSession();
        this.notifyListeners();
        return;
      }

      console.error('Session validation failed:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.session));
  }

  private async executePostLoginCallbacks(): Promise<void> {
    for (const callback of this.postLoginCallbacks) {
      try {
        await callback();
      } catch (error) {
        console.error('Post-login callback error:', error);
      }
    }
  }

  public getSession(): Session | null {
    return this.session;
  }

  public getUser(): User | null {
    return this.session?.user ?? null;
  }

  public getToken(): string | null {
    // Fallback para o storage: se a sessão existe mas o singleton do módulo foi
    // instanciado antes de `window` existir, a leitura direta ainda funciona.
    return this.session?.token ?? readStoredToken();
  }

  /** Relê a sessão persistida e notifica os inscritos. */
  public reloadSession(): void {
    const previous = this.getToken();
    this.session = null;
    this.loadSession();
    if (this.getToken() !== previous) {
      this.notifyListeners();
    }
  }

  public isAuthenticated(): boolean {
    if (this.session !== null && this.session.user.status !== 'BLOCKED') return true;
    // Sessão presente no storage mas ainda não hidratada em memória.
    return this.session === null && readStoredToken() !== null;
  }

  public onPostLogin(callback: PostLoginCallback): () => void {
    this.postLoginCallbacks.add(callback);
    return () => this.postLoginCallbacks.delete(callback);
  }

  public async login(
    email: string,
    password: string,
    rememberMe = true,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.login({ email, password });
      
      if (response) {
        this.session = {
          user: response.user,
          token: response.accessToken,
        };
        this.storage = rememberMe ? 'local' : 'session';
        this.saveSession();
        this.notifyListeners();
        await this.executePostLoginCallbacks();
        return { success: true };
      }
      
      return { success: false, error: 'Credenciais inválidas' };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Erro ao fazer login' };
    }
  }

  public async register(data: { name: string; email: string; password: string; phone?: string; cpf?: string }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await api.register(data);
      
      if (response) {
        this.session = {
          user: response.user,
          token: response.accessToken,
        };
        this.storage = 'local';
        this.saveSession();
        this.notifyListeners();
        await this.executePostLoginCallbacks();
        return { success: true };
      }
      
      return { success: false, error: 'Erro ao criar conta' };
    } catch (error) {
      console.error('Register failed:', error);
      return { success: false, error: 'Erro ao criar conta' };
    }
  }

  public async googleLogin(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await api.googleLogin(idToken);

      if (result.ok) {
        this.session = {
          user: result.data.user,
          token: result.data.accessToken,
        };
        this.storage = 'local';
        this.saveSession();
        this.notifyListeners();
        await this.executePostLoginCallbacks();
        return { success: true };
      }

      // Mensagem do backend quando disponível (ex.: "Conta bloqueada").
      return {
        success: false,
        error: result.message || 'Erro ao fazer login com Google',
      };
    } catch (error) {
      console.error('Google login failed:', error);
      return { success: false, error: 'Erro ao fazer login com Google' };
    }
  }

  public logout(): void {
    this.session = null;
    this.saveSession();
    this.notifyListeners();
  }

  public subscribe(listener: (session: Session | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async refreshSession(): Promise<void> {
    await this.validateSession();
  }
}

// Singleton instance
export const authManager = new AuthManager();
