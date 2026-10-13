'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Address, CreateAddressPayload, Payment, ShippingOption } from '@/lib/types';
import { toNumber, formatPrice } from '@/lib/utils';
import { PriceFormatter } from '@/components/ui/PriceFormatter';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { inputClassName } from '@/components/ui/Input';
import { lookupCep } from '@/lib/cep';

type PaymentChoice = Payment['method'];
type AddressForm = Omit<CreateAddressPayload, 'type' | 'isDefault'>;

const initialAddress: AddressForm = {
  recipient: '',
  zipcode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: '',
};

const paymentOptions: Array<{ value: PaymentChoice; label: string; description: string; available: boolean }> = [
  { value: 'PIX', label: 'PIX', description: 'Pagamento instantâneo', available: true },
  { value: 'CREDIT_CARD', label: 'Cartão de crédito', description: 'Disponível em breve', available: false },
  { value: 'BOLETO', label: 'Boleto bancário', description: 'Disponível em breve', available: false },
];

function statusMessage(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.';
  if (status === 403) return 'Sua conta não tem permissão para concluir esta operação.';
  if (status === 400) return 'Confira os dados informados e tente novamente.';
  if (status === 404) return 'O endereço ou o carrinho não foi encontrado.';
  return 'Não foi possível concluir o checkout. Tente novamente.';
}

function Field({
  label,
  name,
  value,
  onChange,
  required = false,
  className = '',
  maxLength,
  inputMode,
  id,
}: {
  label: string;
  name: keyof AddressForm;
  value: string;
  onChange: (name: keyof AddressForm, value: string) => void;
  required?: boolean;
  className?: string;
  maxLength?: number;
  inputMode?: 'text' | 'numeric';
  id?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        className={inputClassName}
      />
    </label>
  );
}

export default function CheckoutPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { cart, loading: cartLoading, initialized, refresh } = useCart();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('new');
  const [address, setAddress] = useState<AddressForm>(initialAddress);
  const [payment, setPayment] = useState<PaymentChoice>('PIX');
  const [notes, setNotes] = useState('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingSource, setShippingSource] = useState<'superfrete' | 'fallback' | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let active = true;
    void api.getAddresses().then((result) => {
      if (!active) return;
      if (result.ok) {
        setAddresses(result.data);
        const defaultAddress = result.data.find((item) => item.isDefault) ?? result.data[0];
        if (defaultAddress) setSelectedAddressId(defaultAddress.id);
      } else {
        setError(statusMessage(result.status));
      }
      setLoadingAddresses(false);
    });

    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const items = cart?.items ?? [];
  const subtotal = toNumber(cart?.totalAmount) ?? 0;

  const selectedSavedAddress = addresses.find((item) => item.id === selectedAddressId) ?? null;
  const effectiveZipcode = (
    selectedSavedAddress?.zipcode ?? (selectedAddressId === 'new' ? address.zipcode : '')
  )
    .replace(/\D/g, '')
    .slice(0, 8);
  const cartSignature = items.map((item) => `${item.productId}:${item.quantity}`).join(',');
  const canQuoteShipping = isAuthenticated && effectiveZipcode.length === 8 && items.length > 0;
  const shippingQuoteKey = canQuoteShipping ? `${effectiveZipcode}|${cartSignature}` : null;
  const [quotedShippingKey, setQuotedShippingKey] = useState<string | null>(null);

  useEffect(() => {
    if (!canQuoteShipping || !shippingQuoteKey) {
      return;
    }

    const key = shippingQuoteKey;
    let active = true;

    const payload = items.map((item) => ({ productId: item.productId, quantity: item.quantity }));
    void api.calculateShipping(effectiveZipcode, payload).then((result) => {
      if (!active) return;
      if (result.ok) {
        setShippingOptions(result.data.options);
        setShippingSource(result.data.source);
        const cheapest = [...result.data.options].sort((a, b) => a.price - b.price)[0];
        setSelectedShippingId(cheapest ? cheapest.id : null);
        setShippingError(
          result.data.options.length === 0 ? 'Nenhuma opção de frete disponível para este CEP.' : null,
        );
      } else {
        setShippingOptions([]);
        setSelectedShippingId(null);
        setShippingSource(null);
        setShippingError('Não foi possível calcular o frete. Verifique o CEP e tente novamente.');
      }
      setQuotedShippingKey(key);
    });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canQuoteShipping, shippingQuoteKey]);

  const isQuoteCurrent = canQuoteShipping && quotedShippingKey === shippingQuoteKey;
  const visibleShippingOptions = isQuoteCurrent ? shippingOptions : [];
  const visibleSelectedShippingId = isQuoteCurrent ? selectedShippingId : null;
  const visibleShippingLoading = canQuoteShipping && !isQuoteCurrent;
  const visibleShippingError = isQuoteCurrent
    ? shippingError
    : !canQuoteShipping &&
        isAuthenticated &&
        effectiveZipcode.length === 8 &&
        items.length === 0
      ? 'Adicione produtos ao carrinho para calcular o frete.'
      : null;
  const visibleShippingSource = isQuoteCurrent ? shippingSource : null;

  const selectedShipping =
    visibleShippingOptions.find((option) => option.id === visibleSelectedShippingId) ?? null;
  const shipping = selectedShipping ? selectedShipping.price : 0;
  const total = subtotal + shipping;

  const updateAddress = (name: keyof AddressForm, value: string) => {
    setAddress((current) => ({ ...current, [name]: value }));
  };

  const handleZipCodeChange = async (value: string) => {
    const zipcode = value.replace(/\D/g, '').slice(0, 8);
    updateAddress('zipcode', zipcode);
    const data = await lookupCep(zipcode);
    if (!data) return;
    setAddress((current) => ({ ...current, ...data }));
    document.getElementById('checkout-address-number')?.focus();
  };

  const saveNewAddress = async () => {
    setError(null);
    const payload: CreateAddressPayload = {
      ...address,
      recipient: address.recipient || user?.name || '',
      zipcode: address.zipcode.replace(/\D/g, ''),
      state: address.state.trim().toUpperCase(),
      type: 'SHIPPING',
      isDefault: addresses.length === 0,
    };
    if (!payload.recipient || !payload.street || !payload.number || !payload.city || !payload.district) {
      setError('Preencha os dados obrigatórios do endereço.');
      return;
    }
    if (payload.zipcode.length !== 8 || payload.state.length !== 2) {
      setError('Informe um CEP com 8 dígitos e uma UF válida.');
      return;
    }

    setSubmitting(true);
    const addressResult = await api.createAddress(payload);
    setSubmitting(false);
    if (!addressResult.ok) {
      setError(statusMessage(addressResult.status));
      return;
    }

    setAddresses((current) => [...current, addressResult.data]);
    setSelectedAddressId(addressResult.data.id);
    setAddress(initialAddress);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (payment !== 'PIX') {
      setError('Este meio de pagamento ainda não está disponível. Selecione PIX.');
      return;
    }

    if (!selectedAddressId && selectedAddressId !== 'new') {
      setError('Selecione um endereço de entrega.');
      return;
    }

    if (effectiveZipcode.length !== 8) {
      setError('Informe um CEP com 8 dígitos para calcular o frete.');
      return;
    }

    if (!selectedShipping) {
      setError(
        visibleShippingLoading
          ? 'Aguarde o cálculo do frete antes de confirmar o pedido.'
          : 'Selecione uma opção de frete para concluir o pedido.',
      );
      return;
    }

    setSubmitting(true);
    const lockedShipping = { optionId: selectedShipping.id, optionName: selectedShipping.name };
    try {
      let addressId = selectedAddressId;
      if (selectedAddressId === 'new') {
        const payload: CreateAddressPayload = {
          ...address,
          recipient: address.recipient || user?.name || '',
          zipcode: address.zipcode.replace(/\D/g, ''),
          state: address.state.trim().toUpperCase(),
          type: 'SHIPPING',
          isDefault: addresses.length === 0,
        };
        if (payload.zipcode.length !== 8 || payload.state.length !== 2) {
          setError('Informe um CEP com 8 dígitos e uma UF válida.');
          return;
        }
        const addressResult = await api.createAddress(payload);
        if (!addressResult.ok) {
          setError(statusMessage(addressResult.status));
          return;
        }
        addressId = addressResult.data.id;
      }

      const orderResult = await api.createOrder(
        addressId,
        notes.trim() || undefined,
        undefined,
        lockedShipping,
      );
      if (!orderResult.ok) {
        setError(statusMessage(orderResult.status));
        return;
      }

      // Fire and forget: create the payment record so the success page can
      // read it immediately. Errors here are non-fatal — the success page will
      // retry via createPayment (idempotent) on mount.
      void api.createPayment(orderResult.data.id, payment);
      await refresh();
      router.push(`/checkout/sucesso/${orderResult.data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || (cartLoading && !initialized) || (isAuthenticated && loadingAddresses)) {
    return <LoadingState message="Preparando seu checkout..." className="min-h-125" />;
  }

  if (!isAuthenticated) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Entre para finalizar sua compra</h1>
          <p className="mt-3 text-muted-foreground">Seu carrinho e seus endereços ficam vinculados à sua conta.</p>
          <Link href="/login" className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark">
            Entrar na conta
          </Link>
        </section>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Seu carrinho está vazio</h1>
          <p className="mt-3 text-muted-foreground">Adicione produtos antes de iniciar o checkout.</p>
          <Link href="/loja/produtos" className="mt-6 inline-flex rounded-lg bg-accent px-6 py-3 font-semibold text-ink hover:bg-accent-dark">
            Explorar produtos
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="container-custom py-8 md:py-12">
      <nav aria-label="Você está aqui" className="mb-4 text-sm text-muted-foreground">
        <Link href="/loja" className="hover:text-accent">Início</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="font-medium text-foreground">Checkout</span>
      </nav>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Finalização</p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Conclua seu pedido</h1>
      </div>

      {error && <div role="alert" className="mb-6 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-input bg-card p-5 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Endereço de entrega</h2>
                <p className="mt-1 text-sm text-muted-foreground">Usaremos estes dados para enviar seu pedido.</p>
              </div>
              {addresses.length > 0 && <span className="text-sm text-muted-foreground">{addresses.length} salvo{addresses.length === 1 ? '' : 's'}</span>}
            </div>

            {addresses.length > 0 && (
              <div className="mb-6 grid gap-3">
                {addresses.map((item) => (
                  <label key={item.id} className={`cursor-pointer rounded-xl border p-4 transition ${selectedAddressId === item.id ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                    <input type="radio" name="saved-address" value={item.id} checked={selectedAddressId === item.id} onChange={() => setSelectedAddressId(item.id)} className="sr-only" />
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block font-semibold text-foreground">{item.nickname || item.recipient}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{item.street}, {item.number}{item.complement ? `, ${item.complement}` : ''} · {item.city}/{item.state}</span>
                        <span className="block text-sm text-muted-foreground">CEP {item.zipcode}</span>
                      </span>
                      {item.isDefault && <span className="text-xs font-semibold text-accent">Principal</span>}
                    </span>
                  </label>
                ))}
                <label className={`cursor-pointer rounded-xl border p-4 transition ${selectedAddressId === 'new' ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                  <input type="radio" name="saved-address" value="new" checked={selectedAddressId === 'new'} onChange={() => setSelectedAddressId('new')} className="sr-only" />
                  <span className="font-semibold text-foreground">Usar um novo endereço</span>
                </label>
              </div>
            )}

            {selectedAddressId === 'new' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Recebedor" name="recipient" value={address.recipient} onChange={updateAddress} required className="sm:col-span-2" />
                <Field label="CEP" name="zipcode" value={address.zipcode} onChange={(name, value) => name === 'zipcode' ? void handleZipCodeChange(value) : updateAddress(name, value)} required maxLength={8} inputMode="numeric" />
                <Field label="Rua" name="street" value={address.street} onChange={updateAddress} required />
                <Field label="Número" name="number" value={address.number} onChange={updateAddress} required id="checkout-address-number" />
                <Field label="Complemento" name="complement" value={address.complement ?? ''} onChange={updateAddress} />
                <Field label="Bairro" name="district" value={address.district} onChange={updateAddress} required />
                <Field label="Cidade" name="city" value={address.city} onChange={updateAddress} required />
                <Field label="Estado (UF)" name="state" value={address.state} onChange={updateAddress} required maxLength={2} />
                <Field label="Referência" name="reference" value={address.reference ?? ''} onChange={updateAddress} className="sm:col-span-2" />
                <Button type="button" variant="outline" onClick={() => void saveNewAddress()} disabled={submitting} className="sm:col-span-2 sm:justify-self-start">
                  {submitting ? 'Salvando endereço...' : 'Salvar endereço'}
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-background p-5 md:p-7">
            <div className="mb-1 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">Opções de frete</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {effectiveZipcode.length === 8
                    ? `Calculado para o CEP ${effectiveZipcode}.`
                    : 'Selecione ou preencha um endereço com CEP para calcular.'}
                </p>
              </div>
              {visibleShippingSource && (
                <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
                  {visibleShippingSource === 'superfrete' ? 'Cotação SuperFrete' : 'Frete fixo por região'}
                </span>
              )}
            </div>

            {visibleShippingLoading && <p className="mt-4 text-sm text-muted-foreground">Calculando frete…</p>}

            {!visibleShippingLoading && visibleShippingError && visibleShippingOptions.length === 0 && (
              <p role="alert" className="mt-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
                {visibleShippingError}
              </p>
            )}

            {!visibleShippingLoading && visibleShippingOptions.length > 0 && (
              <div className="mt-5 grid gap-3">
                {visibleShippingOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition hover:border-accent/60 ${visibleSelectedShippingId === option.id ? 'border-accent bg-accent/5' : 'border-input'}`}
                  >
                    <input
                      type="radio"
                      name="shipping"
                      value={option.id}
                      checked={visibleSelectedShippingId === option.id}
                      onChange={() => setSelectedShippingId(option.id)}
                      className="h-4 w-4 accent-[#c9a227]"
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-foreground">
                        {option.name}
                        {option.isLocal && <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">Local</span>}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {option.deliveryDays !== null && option.deliveryDays !== undefined
                          ? `Chega em até ${option.deliveryDays} dia${option.deliveryDays === 1 ? '' : 's'} útil${option.deliveryDays === 1 ? '' : 'eis'}`
                          : 'Prazo a combinar'}
                      </span>
                    </span>
                    <span className="font-semibold text-foreground">{formatPrice(option.price)}</span>
                  </label>
                ))}
              </div>
            )}

            {!visibleShippingLoading && visibleShippingOptions.length > 0 && visibleShippingError && (
              <p className="mt-3 text-xs text-muted-foreground">{visibleShippingError}</p>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-background p-5 md:p-7">
            <h2 className="text-xl font-bold text-foreground">Forma de pagamento</h2>
            <div className="mt-5 grid gap-3">
              {paymentOptions.map((option) => (
                  <label key={option.value} className={`flex items-center gap-3 rounded-xl border p-4 ${option.available ? 'cursor-pointer hover:border-accent/60' : 'cursor-not-allowed opacity-50'} ${payment === option.value ? 'border-accent bg-accent/5' : 'border-input'}`}>
                  <input type="radio" name="payment" value={option.value} checked={payment === option.value} onChange={() => option.available && setPayment(option.value)} disabled={!option.available} className="h-4 w-4 accent-[#c9a227]" />
                  <span className="flex-1"><span className="block font-semibold text-foreground">{option.label}</span><span className="block text-sm text-muted-foreground">{option.description}</span></span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-input bg-card p-5 md:p-7">
            <label className="block"><span className="text-sm font-semibold text-foreground">Observações do pedido <span className="font-normal text-muted-foreground">(opcional)</span></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={500} rows={3} className={`${inputClassName} mt-2 resize-y`} /></label>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-muted/30 p-6 text-foreground lg:sticky lg:top-6">
          <h2 className="text-xl font-bold">Resumo da compra</h2>
          <ul className="mt-5 space-y-4 border-b border-border pb-5">
            {items.map((item) => <li key={item.id ?? item.productId} className="flex justify-between gap-4 text-sm"><span className="text-muted-foreground">{item.quantity}x {item.name ?? 'Produto'}</span><PriceFormatter price={(toNumber(item.price) ?? 0) * item.quantity} /></li>)}
          </ul>
          <dl className="mt-5 space-y-2 text-sm"><div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd><PriceFormatter price={subtotal} /></dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Frete{selectedShipping ? ` (${selectedShipping.name})` : ''}</dt><dd>{visibleShippingLoading ? <span className="text-muted-foreground">Calculando…</span> : <PriceFormatter price={shipping} />}</dd></div><div className="mt-4 flex justify-between border-t border-border pt-4 text-lg font-bold"><dt>Total</dt><dd className="text-accent"><PriceFormatter price={total} /></dd></div></dl>
          <Button type="submit" size="lg" className="mt-7 w-full" disabled={submitting || payment !== 'PIX' || visibleShippingLoading || !selectedShipping}>{submitting ? 'Processando pedido...' : visibleShippingLoading ? 'Calculando frete...' : 'Confirmar pedido'}</Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">O estoque é validado no momento da confirmação.</p>
        </aside>
      </form>
    </main>
  );
}
