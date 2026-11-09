'use client';

/**
 * Catálogo → Importar lista.
 *
 * O envio vai SEMPRE para o backend NestJS (`POST /products`) através do
 * cliente `@/lib/api`. O parser de texto é mantido como estava; a camada de
 * interface abaixo apenas o reutiliza, valida cada linha antes do envio e
 * mostra prévia/progresso/resultado.
 *
 * O payload satisfaz o `CreateProductDto` do backend:
 *  - obrigatórios: `sku`, `name`, `slug`, `price` e `categoryId`;
 *  - opcionais usados aqui: `description`, `stock` e `active`.
 *
 * Limitação conhecida: o formato aceito NÃO possui campo de custo, portanto
 * `costPrice` não é importado. O custo deve ser informado depois, na edição
 * do produto (a API também não devolve o custo atual em findAll/findOne).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { inputClassName } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFormSection } from '@/components/admin/AdminFormSection';
import { FeedbackBanner, type FeedbackTone } from '@/components/admin/FeedbackBanner';
import { StatusBadge } from '@/components/admin/StatusBadge';
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

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
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

/** Linhas sem o separador obrigatório são marcadas pelo parser com este prefixo. */
function isInvalidItem(item: ImportItem): boolean {
  return item.name.startsWith('INVALID:');
}

function invalidReason(item: ImportItem): string {
  const raw = item.name.replace(/^INVALID:\s*/, '').trim();
  return raw
    ? `Linha fora do formato "Nome - Quantidade": "${raw}"`
    : 'Linha vazia ou sem nome.';
}

export default function ImportProductsPage() {
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ImportItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  /** Campos obrigatórios do DTO aplicados a todos os itens da lista. */
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('0');
  const [active, setActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api.getCategories({ next: { revalidate: 0 } }).then((data) => {
      if (cancelled) return;
      setCategories(data);
      if (data.length > 0) setCategoryId((current) => current || data[0].id);
      setLoadingCategories(false);
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

  const validItems = useMemo(
    () => parsedItems.filter((item) => !isInvalidItem(item)),
    [parsedItems],
  );
  const invalidItems = useMemo(
    () => parsedItems.filter((item) => isInvalidItem(item)),
    [parsedItems],
  );
  const totalUnits = useMemo(
    () => validItems.reduce((sum, item) => sum + Math.max(0, item.quantity), 0),
    [validItems],
  );

  const successful = results.filter((result) => result.success).length;
  const failed = results.filter((result) => !result.success).length;

  const handleParse = () => {
    const items = parseInput(input);
    setParsedItems(items);
    setResults([]);
    setProgress(0);
    setFeedback(null);

    if (items.length === 0) {
      setFeedback({ tone: 'error', message: 'Nenhuma linha encontrada. Cole a lista antes de analisar.' });
      return;
    }

    const invalidCount = items.filter(isInvalidItem).length;
    if (invalidCount > 0) {
      setFeedback({
        tone: 'warning',
        message:
          `${items.length - invalidCount} linha(s) válida(s) e ${invalidCount} inválida(s). ` +
          'As linhas inválidas aparecem na prévia e NÃO serão importadas.',
      });
      return;
    }

    setFeedback({
      tone: 'success',
      message: `${items.length} linha(s) válida(s) prontas para revisão.`,
    });
  };

  const handleClear = () => {
    setInput('');
    setParsedItems([]);
    setResults([]);
    setProgress(0);
    setFeedback(null);
  };

  const handleImport = async () => {
    if (validItems.length === 0) {
      setFeedback({ tone: 'error', message: 'Não há linhas válidas para importar.' });
      return;
    }

    if (!categoryId) {
      setFeedback({ tone: 'error', message: 'Selecione a categoria de destino antes de importar.' });
      return;
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFeedback({ tone: 'error', message: 'Informe um preço válido (maior ou igual a zero).' });
      return;
    }

    setIsImporting(true);
    setResults([]);
    setProgress(0);
    setFeedback(null);

    // SKUs/slugs já usados no catálogo + os gerados nesta importação: sem isso
    // o backend responderia 409 nas restrições UNIQUE de sku/slug.
    const existing = await api.getProducts(undefined, undefined, { next: { revalidate: 0 } });
    const usedSlugs = new Set(existing.map((product) => product.slug));
    const usedSkus = new Set(existing.map((product) => product.sku));

    const importResults: ImportResult[] = [];

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];
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

      setProgress(((i + 1) / validItems.length) * 100);
      setResults([...importResults]);
    }

    setIsImporting(false);

    const failures = importResults.filter((result) => !result.success).length;
    const successes = importResults.length - failures;

    setFeedback({
      tone: failures > 0 ? 'warning' : 'success',
      message:
        `${successes} produto(s) importado(s) com sucesso` +
        (failures > 0 ? ` e ${failures} falhou(aram). Confira os detalhes nos resultados.` : '.'),
    });
  };

  return (
    <div>
      <AdminPageHeader
        backHref="/admin/produtos"
        backLabel="Voltar aos produtos"
        eyebrow="Catálogo"
        title="Importar produtos em lote"
        description="Cole uma lista no formato aceito, revise a prévia e envie os itens válidos para o catálogo."
        count={parsedItems.length > 0 ? parsedItems.length : undefined}
        countLabel={parsedItems.length === 1 ? 'linha analisada' : 'linhas analisadas'}
      />

      {feedback && (
        <FeedbackBanner
          tone={feedback.tone}
          className="mb-5"
          onDismiss={() => setFeedback(null)}
        >
          {feedback.message}
        </FeedbackBanner>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <AdminFormSection
            title="Lista de produtos"
            description="Uma linha por produto. O separador precisa ser exatamente “ - ” (espaço, hífen, espaço)."
          >
            <label htmlFor="input" className="mb-1.5 block text-sm font-medium text-foreground">
              Cole a lista
            </label>
            <textarea
              id="input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className={`${inputClassName} font-mono text-xs leading-relaxed`}
              rows={10}
              spellCheck={false}
              placeholder={
                'Nome do Produto - Quantidade\nCapa Case Iphone 13 - 20 branca 10 preta 10 azul\nFone Bluetooth - 50'
              }
            />

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {input.trim() === ''
                  ? 'Aguardando a lista.'
                  : `${input.split('\n').filter((line) => line.trim()).length} linha(s) no campo.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isImporting || (input.trim() === '' && parsedItems.length === 0)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                >
                  Limpar
                </button>
                <button
                  type="button"
                  onClick={handleParse}
                  disabled={!input.trim() || isImporting}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                >
                  Analisar lista
                </button>
              </div>
            </div>
          </AdminFormSection>

          <AdminFormSection
            title="Dados aplicados a todos os itens"
            description="O backend exige categoria; preço, estoque e situação vêm da lista e destes campos."
          >
            {loadingCategories ? (
              <LoadingState message="Carregando categorias..." className="min-h-[120px]" />
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="categoryId"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Categoria (obrigatória)
                  </label>
                  <select
                    id="categoryId"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
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
                  <label
                    htmlFor="price"
                    className="mb-1.5 block text-sm font-medium text-foreground"
                  >
                    Preço (R$)
                  </label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className={inputClassName}
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Aplicado igualmente a todas as linhas.
                  </p>
                </div>

                <div className="sm:self-start">
                  <span className="mb-1.5 block text-sm font-medium text-foreground">Situação</span>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-3">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(event) => setActive(event.target.checked)}
                      className="mt-0.5 rounded border-input"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-foreground">
                        Publicar como ativos
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        Desmarcado, os produtos entram ocultos na loja.
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            )}

            {!loadingCategories && categories.length === 0 && (
              <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
                Nenhuma categoria encontrada. Cadastre uma categoria antes de importar — o backend
                exige <code>categoryId</code>.
              </p>
            )}

            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">Custo não é importado.</span> O
                formato aceito e o payload de importação não possuem campo de custo. Informe o
                custo depois, na edição de cada produto.
              </p>
              <p className="mt-1.5">
                <span className="font-semibold text-foreground">Variantes não são cadastradas.</span>{' '}
                Quando a linha traz quantidades por cor, elas são somadas no estoque e registradas
                apenas como observação na descrição — o catálogo não possui campo de variação.
              </p>
            </div>
          </AdminFormSection>
        </div>

        <div className="space-y-5">
          <AdminFormSection title="Formatos aceitos" description="O parser atual aceita estes dois formatos.">
            <ul className="space-y-3 text-sm">
              <li className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="font-semibold text-foreground">Quantidade única</p>
                <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                  Fone Bluetooth - 50
                </code>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estoque = 50. Nome = “Fone Bluetooth”.
                </p>
              </li>
              <li className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="font-semibold text-foreground">Quantidades por cor</p>
                <code className="mt-1 block break-all font-mono text-xs text-muted-foreground">
                  Capa Case - 20 branca 10 preta 10 azul
                </code>
                <p className="mt-1 text-xs text-muted-foreground">
                  Estoque = 40 (soma). As cores ficam apenas na descrição do produto.
                </p>
              </li>
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Linhas sem o separador “ - ” ou sem quantidade numérica são marcadas como inválidas na
              prévia e não são enviadas.
            </p>
          </AdminFormSection>

          <AdminFormSection title="Resumo da análise">
            <dl className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Linhas analisadas</dt>
                <dd className="font-semibold text-foreground">{parsedItems.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Válidas</dt>
                <dd className="font-semibold text-success">{validItems.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Inválidas</dt>
                <dd className={`font-semibold ${invalidItems.length > 0 ? 'text-error' : 'text-foreground'}`}>
                  {invalidItems.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                <dt className="text-muted-foreground">Unidades em estoque</dt>
                <dd className="font-semibold text-foreground">{totalUnits}</dd>
              </div>
            </dl>
          </AdminFormSection>
        </div>
      </div>

      {parsedItems.length > 0 && (
        <AdminFormSection
          className="mt-5"
          title="Prévia da lista"
          description="Revise o nome e o estoque de cada linha antes de importar. Apenas as linhas válidas serão enviadas."
          aside={
            <StatusBadge tone={invalidItems.length > 0 ? 'warning' : 'success'}>
              {validItems.length} válida(s) · {invalidItems.length} inválida(s)
            </StatusBadge>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border text-left">
                <tr>
                  <th className="px-2 py-2 font-semibold text-foreground">#</th>
                  <th className="px-2 py-2 font-semibold text-foreground">Produto</th>
                  <th className="px-2 py-2 font-semibold text-foreground">Estoque</th>
                  <th className="px-2 py-2 font-semibold text-foreground">Variantes</th>
                  <th className="px-2 py-2 font-semibold text-foreground">Validação</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, index) => {
                  const invalid = isInvalidItem(item);
                  return (
                    <tr key={`${index}-${item.name}`} className="border-b border-border last:border-b-0">
                      <td className="px-2 py-2 text-xs text-muted-foreground">{index + 1}</td>
                      <td className={`px-2 py-2 ${invalid ? 'text-error' : 'font-medium text-foreground'}`}>
                        {invalid ? item.name.replace(/^INVALID:\s*/, '') : item.name}
                      </td>
                      <td className="px-2 py-2 text-muted-foreground">
                        {invalid ? '—' : `${item.quantity} un.`}
                      </td>
                      <td className="px-2 py-2 text-xs text-muted-foreground">
                        {item.variants && item.variants.length > 0
                          ? item.variants.map((variant) => `${variant.color}: ${variant.quantity}`).join(', ')
                          : '—'}
                      </td>
                      <td className="px-2 py-2">
                        {invalid ? (
                          <div>
                            <StatusBadge tone="error">Não será importada</StatusBadge>
                            <p className="mt-1 text-xs text-muted-foreground">{invalidReason(item)}</p>
                          </div>
                        ) : (
                          <StatusBadge tone="success">Pronta</StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {invalidItems.length > 0
                ? `${invalidItems.length} linha(s) inválida(s) será(ão) ignorada(s).`
                : 'Todas as linhas estão válidas.'}
            </p>
            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={validItems.length === 0 || isImporting || !categoryId}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {isImporting ? 'Importando...' : `Importar ${validItems.length} produto(s)`}
            </button>
          </div>
        </AdminFormSection>
      )}

      {isImporting && (
        <AdminFormSection className="mt-5" title="Importando" description="Não feche esta aba enquanto o envio estiver em andamento.">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Progresso</span>
            <span className="text-muted-foreground">
              {results.length} de {validItems.length} · {Math.round(progress)}%
            </span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            aria-label="Progresso da importação"
          >
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </AdminFormSection>
      )}

      {results.length > 0 && (
        <AdminFormSection
          className="mt-5"
          title="Resultado da importação"
          description="Resumo por item enviado ao backend."
          aside={
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="success">{successful} sucesso</StatusBadge>
              {failed > 0 && <StatusBadge tone="error">{failed} falha(s)</StatusBadge>}
            </div>
          }
        >
          <ul className="space-y-2">
            {results.map((result, index) => (
              <li
                key={`${index}-${result.name}`}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <span className="min-w-0 font-medium text-foreground">{result.name}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge tone={result.success ? 'success' : 'error'}>
                    {result.success ? 'Importado' : 'Falhou'}
                  </StatusBadge>
                  {result.error && (
                    <span className="text-xs text-muted-foreground">{result.error}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </AdminFormSection>
      )}
    </div>
  );
}
