'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveImageUrl } from '@/lib/api';
import { Brand, Category, ProductFormPayload, SelectedImageCandidate } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  ImageSearchDialog,
  IMAGE_SEARCH_MAX_SELECTION,
} from '@/components/admin/ImageSearchDialog';

const inputClassName =
  'w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';

const labelClassName = 'mb-1 block text-sm font-medium text-foreground';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Gera slug a partir do nome (mesma convenção usada nas URLs da loja). */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

interface PreviewState {
  /** URL exibível no <Image> (object URL local ou rota estática do backend). */
  src: string;
  /** Object URL local criado por URL.createObjectURL (precisa ser revogado). */
  objectUrl: string | null;
}

export default function NewProductPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    comparePrice: '',
    costPrice: '',
    stock: '',
    categoryId: '',
    brandId: '',
  });
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [fetchingUrl, setFetchingUrl] = useState(false);

  /**
   * Imagens escolhidas na busca da internet, ainda NAO baixadas.
   * Ficam pendentes no estado do formulario ate o produto ser salvo — assim a
   * busca funciona antes de o produto existir no banco.
   */
  const [pendingInternetImages, setPendingInternetImages] = useState<
    SelectedImageCandidate[]
  >([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Proteção de rota: ADMIN/OWNER apenas.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.role !== 'ADMIN' && user.role !== 'OWNER') {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, user, router]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [data, brandData] = await Promise.all([
        api.getActiveCategories({ next: { revalidate: 0 }}),
        api.getActiveBrands({ next: { revalidate: 0 }}),
      ]);
      if (!active) return;
      setCategories(data);
      setBrands(brandData);
      if (data.length > 0) {
        setForm((prev) => (prev.categoryId ? prev : { ...prev, categoryId: data[0].id }));
      }
      setLoadingCategories(false);
      setLoadingBrands(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  // Revoga o object URL anterior para não vazar memória.
  useEffect(() => {
    return () => {
      if (preview?.objectUrl) URL.revokeObjectURL(preview.objectUrl);
    };
  }, [preview]);

  const setPreviewFromFile = useCallback((selected: File) => {
    if (!selected.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem (JPEG, PNG, WEBP, GIF ou AVIF).');
      return;
    }
    if (selected.size > MAX_UPLOAD_BYTES) {
      setError('A imagem deve ter no máximo 5 MB.');
      return;
    }

    setError(null);
    setNotice(null);
    setFile(selected);
    setImageUrlInput('');
    setPreview((previous) => {
      if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      const objectUrl = URL.createObjectURL(selected);
      return { src: objectUrl, objectUrl };
    });
  }, []);

  const handleFilesChange = (selectedFiles: FileList | null) => {
    const selected = Array.from(selectedFiles ?? []).slice(0, IMAGE_SEARCH_MAX_SELECTION);
    if (selected.length === 0) return;
    const invalid = selected.find((item) => !item.type.startsWith('image/') || item.size > MAX_UPLOAD_BYTES);
    if (invalid) {
      setError('Cada imagem deve ser válida e ter no máximo 5 MB.');
      return;
    }
    setFiles(selected);
    setPreviewFromFile(selected[0]);
    setNotice(selected.length > 1 ? `${selected.length} imagens selecionadas.` : null);
  };

  /** Modo 3: "Colar Imagem (Ctrl+V)" — lê imagens da área de transferência. */
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const items = Array.from(clipboard.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;

      const pasted = imageItem.getAsFile();
      if (pasted) {
        event.preventDefault();
        setPreviewFromFile(pasted);
        setNotice('Imagem colada da área de transferência.');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [setPreviewFromFile]);

  const handleChange = (field: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'name' && !slugTouched) setSlug(slugify(value));
  };

  /** Modo 2: "Cole a URL da Imagem" — o backend baixa e devolve a rota local. */
  const handleFetchUrl = async () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    setFetchingUrl(true);
    setError(null);
    setNotice(null);

    const result = await api.uploadImageFromUrl(url);
    setFetchingUrl(false);

    if (!result.ok) {
      setError(
        result.status === 400
          ? 'A URL informada não aponta para uma imagem válida.'
          : 'Não foi possível baixar a imagem. Verifique a URL e tente novamente.',
      );
      return;
    }

    setFile(null);
    setFiles([]);
    setPreview((previous) => {
      if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      return { src: resolveImageUrl(result.data.url) ?? result.data.url, objectUrl: null };
    });
    setNotice('Imagem baixada e salva no servidor.');
  };

  const handleRemovePreview = () => {
    setFile(null);
    setFiles([]);
    setPreview((previous) => {
      if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setImageUrlInput('');
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    // Aceita tanto uma imagem local/URL quanto imagens escolhidas na internet:
    // o produto pode ser salvo apenas com as candidatas pendentes — elas são
    // importadas logo depois de o Product existir.
    if (!preview && pendingInternetImages.length === 0) {
      setError('Adicione uma foto do produto antes de salvar.');
      return;
    }
    if (!form.categoryId) {
      setError('Selecione uma categoria.');
      return;
    }

    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      setError('Informe um preço válido.');
      return;
    }

    const payload: ProductFormPayload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      slug: slug.trim() || slugify(form.name),
      description: form.description.trim() || undefined,
      price,
      comparePrice: form.comparePrice ? Number(form.comparePrice) : undefined,
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stock: form.stock ? Number(form.stock) : 0,
      categoryId: form.categoryId,
      brandId: form.brandId.trim() || undefined,
      active: true,
      // A imagem só vai como arquivo se foi escolhida no dispositivo;
      // quando veio por URL ela já está salva e o backend a resolve pelo campo.
      image: file,
      images: files.slice(1),
    };

    setSaving(true);
    const result = await api.createProduct(payload);

    if (!result.ok) {
      setSaving(false);
      setError(
        result.status === 409
          ? 'Já existe um produto com este SKU ou slug.'
          : result.status === 400
            ? 'Dados inválidos. Revise os campos e tente novamente.'
            : 'Não foi possível salvar o produto.',
      );
      return;
    }

    // O produto ja existe: agora importamos as imagens escolhidas na internet.
    // Os downloads externos acontecem FORA de qualquer transacao de banco.
    let importWarning: string | null = null;
    if (pendingInternetImages.length > 0) {
      const importResult = await api.importSelectedImages({
        productId: result.data.id,
        name: result.data.name,
        brand: undefined,
        images: pendingInternetImages.map((img) => ({
          id: img.id,
          title: img.title,
          source: img.source,
          sourceUrl: img.sourceUrl,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          query: img.query,
        })),
      });

      if (!importResult.ok) {
        // O produto NAO e apagado automaticamente: informamos que ele foi criado
        // e que a importacao das imagens falhou.
        importWarning =
          'O produto foi salvo, mas não foi possível importar as imagens da internet.';
      } else {
        // Importacao parcial: o produto esta salvo e as imagens que deram certo
        // ficaram associadas. Dizemos exatamente quais falharam e por que.
        const falhas = (importResult.data.results ?? []).filter(
          (r) => !r.success,
        );
        if (falhas.length > 0) {
          const detalhes = falhas
            .map((f) => (f.domain ? `• ${f.domain}` : '• imagem'))
            .join('\n');
          const motivo = falhas.find((f) => f.error)?.error;
          importWarning =
            `Produto salvo. ${importResult.data.imported ?? importResult.data.images.length} ` +
            `imagem(ns) importada(s) e ${falhas.length} falhou(aram):\n${detalhes}` +
            (motivo ? `\nMotivo: ${motivo}` : '');
        }
      }
    }

    setSaving(false);

    if (importWarning) {
      // Erro com multiplas linhas precisa preservar a quebra na mensagem.
      setError(importWarning);
      return;
    }

    setNotice('Produto criado com sucesso!');
    router.push('/admin/produtos');
  };

  const totalPreviewLabel = useMemo(() => {
    if (file) return `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    return 'Imagem do servidor';
  }, [file]);

  if (authLoading) {
    return <LoadingState message="Verificando permissões..." className="min-h-[500px]" />;
  }

  if (!isAuthenticated || (user && user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    return (
      <main className="container-custom py-16">
        <section className="mx-auto max-w-xl rounded-2xl border-border bg-muted/50 p-8 text-center">
          <h1 className="text-2xl font-bold text-foreground">Acesso restrito</h1>
          <p className="mt-3 text-muted-foreground">
            Esta área é exclusiva para administradores da loja.
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
        <Link href="/admin/dashboard" className="hover:text-accent">
          Painel Admin
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-foreground">Novo produto</span>
      </nav>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Painel administrativo
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Cadastrar produto</h1>
        <p className="mt-2 text-muted-foreground">
          Preencha os dados e adicione a foto por câmera, arquivo, URL ou colando a imagem.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 whitespace-pre-line rounded-xl border-error/30 bg-error/10 px-4 py-3 text-error"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-6 rounded-xl border-success/30 bg-success/10 px-4 py-3 text-success"
        >
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- Dados do produto ---------------- */}
        <section className="rounded-2xl border-border bg-background p-6">
          <h2 className="text-xl font-bold text-foreground">Dados do produto</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="product-name" className={labelClassName}>
                Nome *
              </label>
              <input
                id="product-name"
                name="name"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={inputClassName}
                placeholder="Camiseta Básica Algodão"
              />
            </div>

            <div>
              <label htmlFor="product-sku" className={labelClassName}>
                SKU *
              </label>
              <input
                id="product-sku"
                name="sku"
                required
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                className={inputClassName}
                placeholder="CAM-001"
              />
            </div>

            <div>
              <label htmlFor="product-slug" className={labelClassName}>
                Slug *
              </label>
              <input
                id="product-slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                className={inputClassName}
                placeholder="camiseta-basica-algodao"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="product-description" className={labelClassName}>
                Descrição
              </label>
              <textarea
                id="product-description"
                name="description"
                rows={4}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                className={inputClassName}
                placeholder="Detalhes, material, medidas..."
              />
            </div>

            <div>
              <label htmlFor="product-price" className={labelClassName}>
                Preço (R$) *
              </label>
              <input
                id="product-price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => handleChange('price', e.target.value)}
                className={inputClassName}
                placeholder="89.90"
              />
            </div>

            <div>
              <label htmlFor="product-compare-price" className={labelClassName}>
                Preço comparativo (R$)
              </label>
              <input
                id="product-compare-price"
                name="comparePrice"
                type="number"
                min="0"
                step="0.01"
                value={form.comparePrice}
                onChange={(e) => handleChange('comparePrice', e.target.value)}
                className={inputClassName}
                placeholder="119.90"
              />
            </div>

            <div>
              <label htmlFor="product-cost-price" className={labelClassName}>
                Custo (R$)
              </label>
              <input
                id="product-cost-price"
                name="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => handleChange('costPrice', e.target.value)}
                className={inputClassName}
                placeholder="45.00"
              />
            </div>

            <div>
              <label htmlFor="product-stock" className={labelClassName}>
                Estoque *
              </label>
              <input
                id="product-stock"
                name="stock"
                type="number"
                min="0"
                step="1"
                required
                value={form.stock}
                onChange={(e) => handleChange('stock', e.target.value)}
                className={inputClassName}
                placeholder="10"
              />
            </div>

            <div>
              <label htmlFor="product-category" className={labelClassName}>
                Categoria *
              </label>
              <select
                id="product-category"
                name="categoryId"
                required
                value={form.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                className={inputClassName}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories ? 'Carregando...' : 'Selecione uma categoria'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-brand" className={labelClassName}>
                Marca
              </label>
              {/*
                Antes era um campo de texto livre rotulado "Marca (ID)". O valor
                digitado (ex.: "Lattafa") era enviado como `brandId` e o backend
                respondia 400 "Brand not found" — que a UI traduzia como
                "Dados inválidos". Agora é um seletor das marcas existentes, então
                só IDs reais podem ser enviados.
              */}
              <select
                id="product-brand"
                name="brandId"
                value={form.brandId}
                onChange={(e) => handleChange('brandId', e.target.value)}
                className={inputClassName}
                disabled={loadingBrands}
              >
                <option value="">
                  {loadingBrands ? 'Carregando...' : 'Sem marca'}
                </option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ---------------- Foto do produto ---------------- */}
        <section className="rounded-2xl border-border bg-background p-6">
          <h2 className="text-xl font-bold text-foreground">Foto do produto</h2>

          {/* Preview */}
          <div className="mt-5">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border-dashed border-border bg-muted/30">
              {preview ? (
                <Image
                  src={preview.src}
                  alt="Pré-visualização da foto do produto"
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <span className="text-4xl" aria-hidden="true">
                    📷
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Nenhuma imagem selecionada
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use a câmera, escolha um arquivo, informe uma URL ou cole com Ctrl+V
                  </p>
                </div>
              )}
            </div>

            {preview && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-muted-foreground">{totalPreviewLabel}</p>
                <button
                  type="button"
                  onClick={handleRemovePreview}
                  className="shrink-0 text-xs font-semibold text-error hover:underline"
                >
                  Remover imagem
                </button>
              </div>
            )}
          </div>

          {/* Modo 1: câmera / galeria */}
          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                1. Tirar foto / Galeria
              </p>
              <input
                ref={fileInputRef}
                id="product-image-file"
                name="image"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  handleFilesChange(e.target.files);
                }}
                multiple
                className="block w-full cursor-pointer rounded-lg border-border bg-background text-sm text-muted-foreground file:mr-3 file:rounded-l-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-accent-dark"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Em celulares e tablets abre a câmera traseira automaticamente.
              </p>
            </div>

            {/* Modo 2: URL da imagem */}
            <div>
              <label htmlFor="product-image-url" className="mb-2 block text-sm font-medium text-foreground">
                2. Cole a URL da Imagem
              </label>
              <div className="flex gap-2">
                <input
                  id="product-image-url"
                  name="imageUrl"
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className={inputClassName}
                  placeholder="https://exemplo.com/foto.jpg"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchUrl}
                  disabled={fetchingUrl || !imageUrlInput.trim()}
                >
                  {fetchingUrl ? 'Baixando...' : 'Baixar'}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A imagem é baixada pelo servidor e salva em /uploads.
              </p>
            </div>

            {/* Modo 3: colar */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                3. Colar Imagem (Ctrl+V / Cole)
              </p>
              <div className="rounded-lg border-dashed border-border bg-muted/30 px-4 py-5 text-center text-xs text-muted-foreground">
                Copie uma imagem e pressione{' '}
                <kbd className="rounded border-border px-1.5 py-0.5 font-mono text-[11px]">
                  Ctrl
                </kbd>{' '}
                +{' '}
                <kbd className="rounded border-border px-1.5 py-0.5 font-mono text-[11px]">
                  V
                </kbd>{' '}
                (ou mantenha pressionado para colar no celular).
              </div>
            </div>

            {/* Modo 4: busca na internet (somente OWNER) */}
            {isOwner && (
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  4. Buscar imagem na internet
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setSearchDialogOpen(true)}
                >
                  🔎 Buscar imagem na internet
                </Button>
                <p className="mt-1 text-xs text-muted-foreground">
                  O termo de busca é preenchido com o nome do produto. As imagens escolhidas só
                  são baixadas quando você salvar.
                </p>
              </div>
            )}
          </div>

          {/* Imagens selecionadas na internet (pendentes até salvar) */}
          {pendingInternetImages.length > 0 && (
            <div className="mt-6 rounded-xl border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Fotos selecionadas</p>
                <p className="text-xs text-muted-foreground">
                  {pendingInternetImages.length}/{IMAGE_SEARCH_MAX_SELECTION} selecionadas
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {pendingInternetImages.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border-border bg-background">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.thumbnailUrl || img.imageUrl}
                      alt={img.title || 'Imagem selecionada'}
                      className="h-full w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingInternetImages((current) =>
                          current.filter((item) => item.id !== img.id),
                        )
                      }
                      aria-label="Remover imagem"
                      className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Serão baixadas e associadas ao produto quando você salvar.
              </p>
            </div>
          )}
        </section>

        <div className="lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/admin/dashboard')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar produto'}
            </Button>
          </div>
        </div>
      </form>

      {/* Busca de imagens na internet (reutilizável; só OWNER).
          A `key` depende APENAS de `open`: assim o diálogo é remontado ao abrir
          (pegando o nome atual do produto) sem ser destruído enquanto o
          usuário digita ou uma busca está em andamento. */}
      <ImageSearchDialog
        key={searchDialogOpen ? 'search-open' : 'search-closed'}
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        initialQuery={form.name}
        initiallySelected={pendingInternetImages}
        onConfirm={(images) => {
          setPendingInternetImages(images.slice(0, IMAGE_SEARCH_MAX_SELECTION));
          setNotice(
            `${images.length} imagem(ns) selecionada(s). Elas serão baixadas ao salvar o produto.`,
          );
          setError(null);
        }}
      />
    </main>
  );
}
