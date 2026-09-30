'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { api, resolveImageUrl } from '@/lib/api';
import { Brand, Category, ProductFormPayload, ProductImage, SelectedImageCandidate } from '@/lib/types';
import { LoadingState } from '@/components/ui/LoadingState';
import { ImageSearchDialog } from '@/components/admin/ImageSearchDialog';

const inputClassName =
  'w-full rounded-lg border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40';

const labelClassName = 'mb-1 block text-sm font-medium text-foreground';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

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
  src: string;
  objectUrl: string | null;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const isOwner = user?.role === 'OWNER';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    comparePrice: '',
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

  const [pendingInternetImages, setPendingInternetImages] = useState<SelectedImageCandidate[]>([]);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        api.getActiveCategories({ next: { revalidate: 0 } }),
        api.getActiveBrands({ next: { revalidate: 0 } }),
      ]);
      if (!active) return;
      setCategories(data);
      setBrands(brandData);
      setLoadingCategories(false);
      setLoadingBrands(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!params.id) return;

    const loadProduct = async () => {
      const result = await api.getProductById(params.id as string, { next: { revalidate: 0 } });
      if (!result) {
        setError('Produto não encontrado.');
        setLoadingProduct(false);
        return;
      }

      setForm({
        name: result.name,
        sku: result.sku,
        description: result.description || '',
        price: String(result.price),
        comparePrice: result.comparePrice ? String(result.comparePrice) : '',
        stock: String(result.stock),
        categoryId: result.categoryId || '',
        brandId: result.brandId || '',
      });
      setSlug(result.slug);
      setExistingImages(result.images ?? []);

      if (result.images && result.images.length > 0) {
        const firstImage = result.images[0];
        const resolvedUrl = resolveImageUrl(firstImage.url);
        if (resolvedUrl) {
          setPreview({ src: resolvedUrl, objectUrl: null });
        }
      }

      setLoadingProduct(false);
    };

    void loadProduct();
  }, [params.id]);

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
    const selected = Array.from(selectedFiles ?? []).slice(0, 5);
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
    setPreview((previous) => {
      if (previous?.objectUrl) URL.revokeObjectURL(previous.objectUrl);
      return null;
    });
    setImageUrlInput('');
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveExistingImage = async (image: ProductImage) => {
    if (existingImages.length <= 1) {
      setError('O produto precisa manter pelo menos uma imagem.');
      return;
    }
    setRemovingImageId(image.id);
    const result = await api.deleteProductImage(params.id as string, image.id);
    setRemovingImageId(null);
    if (!result.ok) {
      setError('Não foi possível remover esta imagem.');
      return;
    }
    const remaining = existingImages.filter((item) => item.id !== image.id);
    setExistingImages(remaining);
    if (preview?.src === resolveImageUrl(image.url)) {
      const next = remaining[0];
      setPreview(next ? { src: resolveImageUrl(next.url) ?? next.url, objectUrl: null } : null);
    }
  };

  const handleMoveExistingImage = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= existingImages.length) return;
    const current = existingImages[index];
    const target = existingImages[targetIndex];
    const currentResult = await api.updateProductImage(params.id as string, current.id, { position: target.position });
    const targetResult = await api.updateProductImage(params.id as string, target.id, { position: current.position });
    if (!currentResult.ok || !targetResult.ok) {
      setError('Não foi possível reorganizar as imagens.');
      return;
    }
    const reordered = [...existingImages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setExistingImages(reordered);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

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
      stock: form.stock ? Number(form.stock) : 0,
      categoryId: form.categoryId,
      brandId: form.brandId.trim() || undefined,
      active: true,
      image: file,
      images: files.slice(1),
    };

    setSaving(true);
    const result = await api.updateProduct(params.id as string, payload);

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
        importWarning = 'Não foi possível importar as imagens da internet.';
      } else {
        const falhas = (importResult.data.results ?? []).filter((item) => !item.success);
        if (falhas.length > 0) {
          const detalhes = falhas
            .map((falha) => (falha.domain ? `• ${falha.domain}` : '• imagem'))
            .join('\n');
          const motivo = falhas.find((falha) => falha.error)?.error;
          importWarning =
            `Produto atualizado. ${importResult.data.imported ?? importResult.data.images.length} ` +
            `imagem(ns) importada(s) e ${falhas.length} falhou(aram):\n${detalhes}` +
            (motivo ? `\nMotivo: ${motivo}` : '');
        }
      }
    }

    setSaving(false);

    if (importWarning) {
      setError(importWarning);
      return;
    }

    setNotice('Produto atualizado com sucesso!');
    router.push('/admin/produtos');
  };

  const totalPreviewLabel = useMemo(() => {
    if (file) return `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    return 'Imagem do servidor';
  }, [file]);

  if (authLoading || loadingProduct) {
    return <LoadingState message="Carregando produto..." className="min-h-125" />;
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
        <Link href="/admin/produtos" className="hover:text-accent">
          Produtos
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="font-medium text-foreground">Editar produto</span>
      </nav>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">
          Painel administrativo
        </p>
        <h1 className="mt-2 text-3xl font-bold text-foreground">Editar produto</h1>
        <p className="mt-2 text-muted-foreground">
          Atualize os dados do produto.
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-6 whitespace-pre-line rounded-xl border-error/30 bg-error/10 px-4 py-3 text-error">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-6 rounded-xl border-success/30 bg-success/10 px-4 py-3 text-success">
          {notice}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
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
                Mesmo motivo do cadastro: texto livre era enviado como `brandId`
                e o backend respondia 400 "Brand not found" ("Dados inválidos").
                Aqui só IDs de marcas existentes podem ser escolhidos.
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

        <section className="rounded-2xl border-border bg-background p-6">
          <h2 className="text-xl font-bold text-foreground">Foto do produto</h2>

          {existingImages.length > 0 && (
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium text-foreground">Imagens atuais</p>
              <div className="grid grid-cols-3 gap-2">
                {existingImages.map((image, index) => (
                  <div key={image.id} className="relative overflow-hidden rounded-lg border border-input bg-muted">
                    <div className="relative aspect-square">
                      <Image src={resolveImageUrl(image.url) ?? image.url} alt={image.alt ?? form.name} fill unoptimized className="object-cover" />
                    </div>
                    <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                      <button type="button" onClick={() => void handleMoveExistingImage(index, -1)} disabled={index === 0} className="rounded bg-ink/80 px-2 py-1 text-xs text-white disabled:opacity-40" aria-label="Mover imagem para esquerda">←</button>
                      <button type="button" onClick={() => void handleRemoveExistingImage(image)} disabled={removingImageId === image.id} className="rounded bg-error/90 px-2 py-1 text-xs text-white disabled:opacity-40" aria-label="Remover imagem">{removingImageId === image.id ? '...' : '×'}</button>
                      <button type="button" onClick={() => void handleMoveExistingImage(index, 1)} disabled={index === existingImages.length - 1} className="rounded bg-ink/80 px-2 py-1 text-xs text-white disabled:opacity-40" aria-label="Mover imagem para direita">→</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

            <div className="mt-4 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
                onChange={(e) => {
                  handleFilesChange(e.target.files);
                }}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Escolher arquivo
              </button>

              <div className="flex gap-2">
                <input
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Cole a URL da imagem"
                  className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={fetchingUrl || !imageUrlInput.trim()}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  {fetchingUrl ? 'Baixando...' : 'Baixar'}
                </button>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => setSearchDialogOpen(true)}
                  className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Buscar imagem na internet
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="lg:col-span-2 flex justify-end gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-lg border border-border px-6 py-2.5 font-semibold text-foreground hover:bg-muted"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-6 py-2.5 font-semibold text-ink hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      {isOwner && (
        <ImageSearchDialog
          open={searchDialogOpen}
          onClose={() => setSearchDialogOpen(false)}
          initialQuery={form.name}
          onConfirm={(images) => {
            setPendingInternetImages(images);
            setNotice(`${images.length} imagem(ns) selecionada(s). Serão importadas ao salvar.`);
          }}
          initiallySelected={pendingInternetImages}
        />
      )}
    </main>
  );
}
