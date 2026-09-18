'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Address, CreateAddressPayload, User } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { SESSION_STORAGE_KEY } from '@/lib/constants';

/** Formulário vazio usado para criar um novo endereço. */
const EMPTY_ADDRESS_FORM: CreateAddressPayload = {
  recipient: '',
  zipcode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: '',
  type: 'SHIPPING',
};

const inputClassName =
  'w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';

const labelClassName = 'mb-1 block text-sm font-medium text-foreground';

/** Lê usuário e token da sessão persistida em 'auth_session' (localStorage). */
function readStoredSession(): { user: User | null; token: string | null } {
  const empty = { user: null, token: null };
  if (typeof window === 'undefined') return empty;

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return empty;

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;

    const { user, token } = parsed as { user?: unknown; token?: unknown };
    return {
      user: user && typeof user === 'object' ? (user as User) : null,
      token: typeof token === 'string' && token.length > 0 ? token : null,
    };
  } catch {
    return empty;
  }
}

function formatAddressLine(address: Address): string {
  return `${address.street}, ${address.number}${
    address.complement ? ` - ${address.complement}` : ''
  }`;
}

function AddressCard({
  address,
  onDelete,
  deleting,
}: {
  address: Address;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <li className="rounded-xl border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{address.recipient}</p>
            {address.isDefault && (
              <span className="inline-flex items-center rounded-full border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                Principal
              </span>
            )}
          </div>
          <address className="mt-1 text-sm not-italic text-muted-foreground">
            <span className="block">{formatAddressLine(address)}</span>
            <span className="block">
              {address.district} — {address.city}/{address.state}
            </span>
            <span className="block">CEP {address.zipcode}</span>
            {address.reference && <span className="block">Ref.: {address.reference}</span>}
          </address>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(address.id)}
          disabled={deleting}
          className="shrink-0 text-error hover:bg-error/10"
          aria-label={`Remover endereço de ${address.recipient}`}
        >
          {deleting ? 'Removendo...' : 'Remover'}
        </Button>
      </div>
    </li>
  );
}

function AddressForm({
  onSubmit,
  saving,
}: {
  onSubmit: (payload: CreateAddressPayload) => Promise<boolean>;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateAddressPayload>(EMPTY_ADDRESS_FORM);

  const handleChange = (field: keyof CreateAddressPayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = await onSubmit(form);
    if (created) setForm(EMPTY_ADDRESS_FORM);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="address-recipient" className={labelClassName}>
            Destinatário
          </label>
          <input
            id="address-recipient"
            name="recipient"
            required
            value={form.recipient}
            onChange={(e) => handleChange('recipient', e.target.value)}
            className={inputClassName}
            placeholder="Nome de quem recebe"
          />
        </div>

        <div>
          <label htmlFor="address-zipcode" className={labelClassName}>
            CEP
          </label>
          <input
            id="address-zipcode"
            name="zipcode"
            required
            inputMode="numeric"
            autoComplete="postal-code"
            value={form.zipcode}
            onChange={(e) => handleChange('zipcode', e.target.value)}
            className={inputClassName}
            placeholder="00000-000"
          />
        </div>

        <div>
          <label htmlFor="address-number" className={labelClassName}>
            Número
          </label>
          <input
            id="address-number"
            name="number"
            required
            value={form.number}
            onChange={(e) => handleChange('number', e.target.value)}
            className={inputClassName}
            placeholder="123"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address-street" className={labelClassName}>
            Rua
          </label>
          <input
            id="address-street"
            name="street"
            required
            autoComplete="address-line1"
            value={form.street}
            onChange={(e) => handleChange('street', e.target.value)}
            className={inputClassName}
            placeholder="Rua, avenida..."
          />
        </div>

        <div>
          <label htmlFor="address-complement" className={labelClassName}>
            Complemento
          </label>
          <input
            id="address-complement"
            name="complement"
            value={form.complement ?? ''}
            onChange={(e) => handleChange('complement', e.target.value)}
            className={inputClassName}
            placeholder="Apto, bloco (opcional)"
          />
        </div>

        <div>
          <label htmlFor="address-district" className={labelClassName}>
            Bairro
          </label>
          <input
            id="address-district"
            name="district"
            required
            value={form.district}
            onChange={(e) => handleChange('district', e.target.value)}
            className={inputClassName}
            placeholder="Centro"
          />
        </div>

        <div>
          <label htmlFor="address-city" className={labelClassName}>
            Cidade
          </label>
          <input
            id="address-city"
            name="city"
            required
            autoComplete="address-level2"
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className={inputClassName}
            placeholder="São Paulo"
          />
        </div>

        <div>
          <label htmlFor="address-state" className={labelClassName}>
            Estado
          </label>
          <input
            id="address-state"
            name="state"
            required
            maxLength={2}
            autoComplete="address-level1"
            value={form.state}
            onChange={(e) => handleChange('state', e.target.value.toUpperCase())}
            className={inputClassName}
            placeholder="SP"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address-reference" className={labelClassName}>
            Ponto de referência
          </label>
          <input
            id="address-reference"
            name="reference"
            value={form.reference ?? ''}
            onChange={(e) => handleChange('reference', e.target.value)}
            className={inputClassName}
            placeholder="Próximo a... (opcional)"
          />
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Salvando...' : 'Adicionar endereço'}
      </Button>
    </form>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-foreground">{value}</dd>
    </div>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();

  const [profile, setProfile] = useState<User | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Proteção de rota: usuários não autenticados vão para /login.
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const loadAddresses = useCallback(async () => {
    const result = await api.getAddresses();
    if (result.ok) {
      setAddresses(result.data);
    } else if (result.status !== 401) {
      setError('Não foi possível carregar seus endereços.');
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    let active = true;

    const load = async () => {
      setLoadingData(true);
      setError(null);

      const { user: storedUser, token } = readStoredSession();

      const [meResult] = await Promise.all([
        token ? api.getMe(token).catch(() => null) : Promise.resolve(null),
        loadAddresses(),
      ]);

      if (!active) return;

      setProfile(meResult ?? storedUser);
      setLoadingData(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [isAuthenticated, loadAddresses]);

  const handleCreateAddress = async (payload: CreateAddressPayload): Promise<boolean> => {
    setSaving(true);
    setError(null);

    const result = await api.createAddress(payload);
    setSaving(false);

    if (!result.ok) {
      setError(
        result.status === 400
          ? 'Verifique os dados do endereço e tente novamente.'
          : 'Não foi possível salvar o endereço.',
      );
      return false;
    }

    setAddresses((prev) => [...prev, result.data]);
    return true;
  };

  const handleDeleteAddress = async (id: string) => {
    setDeletingId(id);
    setError(null);

    const result = await api.deleteAddress(id);
    setDeletingId(null);

    if (!result.ok) {
      setError('Não foi possível remover o endereço.');
      return;
    }

    setAddresses((prev) => prev.filter((address) => address.id !== id));
  };

  const handleLogout = () => {
    logout();
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // localStorage indisponível (modo privado): logout em memória já ocorreu.
    }
    router.push('/');
  };

  if (authLoading || loadingData) {
    return <LoadingState message="Carregando sua conta..." className="min-h-[500px]" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Entre para ver sua conta</h1>
          <p className="mt-3 text-muted-foreground">
            Você precisa estar logado para acessar seus dados.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark"
          >
            Entrar na conta
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container-custom py-8 md:py-12">
      <nav aria-label="Você está aqui" className="mb-4 text-sm text-muted-foreground">
        <Link href="/loja" className="hover:text-accent">
          Início
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-foreground">Minha Conta</span>
      </nav>

      <div className="mb-8 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
            Área do cliente
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">Minha Conta</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="self-start"
        >
          Sair da conta
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-xl border-error/30 bg-error/10 px-4 py-3 text-error"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-input bg-card p-6">
          <h2 className="text-xl font-bold text-foreground">Dados pessoais</h2>

          {profile ? (
            <dl className="mt-5 space-y-4">
              <ProfileField label="Nome" value={profile.name} />
              <ProfileField label="Email" value={profile.email} />
              <ProfileField label="Telefone" value={profile.phone ?? 'Não informado'} />
              <ProfileField label="CPF" value={profile.cpf ?? 'Não informado'} />
            </dl>
          ) : (
            <p className="mt-5 text-muted-foreground">Não foi possível carregar seus dados.</p>
          )}

          <div className="mt-6 border-t border-border pt-5">
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/pedidos" className="font-medium text-accent hover:text-accent-dark">
                  Meus pedidos →
                </Link>
              </li>
              <li>
                <Link href="/loja/carrinho" className="font-medium text-accent hover:text-accent-dark">
                  Meu carrinho →
                </Link>
              </li>
              <li>
                <Link href="/loja" className="font-medium text-accent hover:text-accent-dark">
                  Continuar comprando →
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-input bg-card p-6">
          <h2 className="text-xl font-bold text-foreground">Meus endereços</h2>

          {addresses.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              Você ainda não cadastrou endereços. Adicione um abaixo para agilizar suas compras.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {addresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onDelete={handleDeleteAddress}
                  deleting={deletingId === address.id}
                />
              ))}
            </ul>
          )}

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-lg font-semibold text-foreground">Adicionar novo endereço</h3>
            <div className="mt-4">
              <AddressForm onSubmit={handleCreateAddress} saving={saving} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
