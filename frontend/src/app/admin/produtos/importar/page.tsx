'use client';

/**
 * Catálogo → Importar lista.
 *
 * O envio vai SEMPRE para o backend NestJS (`POST /products`) através do
 * cliente `@/lib/api`. Antes este arquivo fazia `fetch('/api/products')`, uma
 * rota do Next.js que não existe — a resposta era o HTML 404, não o JSON da API.
 *
 * O payload satisfaz o `CreateProductDto` do backend:
 *  - obrigatórios: `sku`, `name`, `slug`, `price` e `categoryId`;
 *  - opcionais usados aqui: `description`, `stock` e `active`.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { inputClassName } from '@/components/ui/Input';
import { api } from '@/lib/api';
import type { Category, ProductFormPayload } from '@/lib/types';

interface ImportItem {
  name: string;
  quantity: number;
  variants?: { color: string; quantity: number }[];
}

interface ImportResult {
  name: string;
  success: boolean;
  error?: string;
}

/** Mesma convenção de slug usada no cadastro de produtos. */
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

/** Mensagem amigável por status HTTP do backend (a API só devolve o status). */
function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Payload inválido (confira nome, preço e categoria).';
    case 401:
      return 'Sessão expirada. Entre novamente.';
    case 403:
      return 'Sua conta não tem permissão para cadastrar produtos.';
    case 409:
      return 'Já existe produto com este SKU ou slug.';
    case 0:
      return 'Erro de conexão com a API.';
    default:
      return `Erro do servidor (HTTP ${status}).`;
  }
}

export default function ImportProductsPage() {
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ImportItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);

  /** Campos obrigatórios do DTO aplicados a todos os itens da lista. */
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api.getCategories({ next: { revalidate: 0 } }).then((data) => {
      if (cancelled) return;
      setCategories(data);
      if (data.length > 0) setCategoryId((current) => current || data[0].id);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const parseInput = (text: string): ImportItem[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const items: ImportItem[] = [];

    for (const line of lines) {
      // Use lastIndexOf(' - ') to correctly handle product names that contain hyphens.
      const sepIndex = line.lastIndexOf(' - ');
      if (sepIndex === -1) {
        // Lines without ' - ' separator are invalid — include them as invalid in results
        items.push({ name: `INVALID: ${line.trim()}`, quantity: 0 });
        continue;
      }

      const name = line.substring(0, sepIndex).trim();
      const rest = line.substring(sepIndex + 3).trim(); // skip ' - ' (3 chars)

      if (!name) {
        items.push({ name: `INVALID: ${line.trim()}`, quantity: 0 });
        continue;
      }

      // Verifica se há variantes (ex: "20 branca 10 preta 10 azul")
      const variantMatches = rest.match(/(\d+)\s+(\w+)/g);
      
      if (variantMatches && variantMatches.length > 1) {
        // Múltiplas variantes
        const variants = variantMatches.map(match => {
          const [, quantity, color] = match.match(/(\d+)\s+(\w+)/) || [];
          return { color, quantity: parseInt(quantity, 10) };
        });

        items.push({ name, quantity: variants.reduce((sum, v) => sum + v.quantity, 0), variants });
      } else {
        // Quantidade única
        const quantity = parseInt(rest, 10);
        if (!isNaN(quantity)) {
          items.push({ name, quantity });
        } else {
          items.push({ name: `INVALID: ${line.trim()}`, quantity: 0 });
        }
      }
    }

    return items;
  };

  const handleParse = () => {
    const items = parseInput(input);
    setParsedItems(items);
    setResults([]);
    setProgress(0);
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;

    if (!categoryId) {
      window.alert('Selecione a categoria de destino antes de importar.');
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      window.alert('Informe um preço válido (maior ou igual a zero).');
      return;
    }

    setIsImporting(true);
    setResults([]);
    setProgress(0);

    // SKUs/slugs já usados no catálogo + os gerados nesta importação: sem isso
    // o backend responderia 409 nas restrições UNIQUE de sku/slug.
    const existing = await api.getProducts(undefined, undefined, { next: { revalidate: 0 } });
    const usedSlugs = new Set(existing.map((product) => product.slug));
    const usedSkus = new Set(existing.map((product) => product.sku));

    const importResults: ImportResult[] = [];

    for (let i = 0; i < parsedItems.length; i++) {
      const item = parsedItems[i];
      const baseSlug = slugify(item.name) || `produto-${i + 1}`;

      let slug = baseSlug;
      let suffix = 2;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(slug);

      let sku = slug.toUpperCase();
      suffix = 2;
      while (usedSkus.has(sku)) {
        sku = `${slug.toUpperCase()}-${suffix}`;
        suffix += 1;
      }
      usedSkus.add(sku);

      const variantsNote =
        item.variants && item.variants.length > 0
          ? ` Variantes: ${item.variants.map((v) => `${v.color} (${v.quantity})`).join(', ')}.`
          : '';

      const payload: ProductFormPayload = {
        sku,
        name: item.name,
        slug,
        description: `Importado em lote — ${item.quantity} unidade(s).${variantsNote}`,
        price: parsedPrice,
        stock: item.quantity,
        categoryId,
        active,
      };
      
      try {
        const result = await api.createProduct(payload);

        if (result.ok) {
          importResults.push({ name: item.name, success: true });
        } else {
          importResults.push({
            name: item.name,
            success: false,
            error: messageForStatus(result.status),
          });
        }
      } catch {
        importResults.push({ name: item.name, success: false, error: 'Erro de conexão' });
      }

      setProgress(((i + 1) / parsedItems.length) * 100);
      setResults([...importResults]);
    }

    setIsImporting(false);
  };

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-primary">
            ← Voltar ao painel
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6">Importar produtos em lote</h1>

        <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
          <div className="mb-4">
            <label htmlFor="input" className="block text-sm font-medium text-foreground mb-2">
              Cole a lista de produtos
            </label>
            <textarea
              id="input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={inputClassName}
              rows={10}
              placeholder="Nome do Produto - Quantidade&#10;Capa Case Iphone 13 - 20 branca 10 preta 10 azul&#10;Fone Bluetooth - 50"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Formato: &quot;Nome do Produto - Quantidade&quot; ou &quot;Nome - Qtd1 cor1 Qtd2 cor2&quot;
            </p>
          </div>

          {/* Campos obrigatórios/opcionais do DTO aplicados a toda a lista */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-foreground mb-2">
                Categoria (obrigatória)
              </label>
              <select
                id="categoryId"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClassName}
              >
                <option value="">Selecione...</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-foreground mb-2">
                Preço (R$)
              </label>
              <input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClassName}
                placeholder="0.00"
              />
            </div>

            <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-input"
              />
              Publicar como ativos
            </label>
          </div>

          {categories.length === 0 && (
            <p className="mt-3 text-sm text-warning">
              Nenhuma categoria encontrada. Cadastre uma categoria antes de importar — o backend
              exige <code>categoryId</code>.
            </p>
          )}

          <div className="mt-6 flex gap-4">
            <Button onClick={handleParse} disabled={!input.trim()}>
              Analisar
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedItems.length === 0 || isImporting || !categoryId}
              variant="primary"
            >
              {isImporting ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>

        {parsedItems.length > 0 && (
          <div className="mt-6 bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Produtos encontrados ({parsedItems.length})</h2>
            <ul className="space-y-2">
              {parsedItems.map((item, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{item.name}</span> - {item.quantity} unidades
                  {item.variants && (
                    <span className="text-muted-foreground ml-2">
                      ({item.variants.map(v => `${v.color}: ${v.quantity}`).join(', ')})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isImporting && (
          <div className="mt-6 bg-card rounded-lg border border-border p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Progresso</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-6 bg-card rounded-lg border border-border p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
              Resultados: {successful} sucesso, {failed} falhas
            </h2>
            <ul className="space-y-2">
              {results.map((result, index) => (
                <li
                  key={index}
                  className={`text-sm ${result.success ? 'text-success' : 'text-error'}`}
                >
                  {result.success ? '✓' : '✗'} {result.name}
                  {result.error && <span className="text-muted-foreground ml-2">({result.error})</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
