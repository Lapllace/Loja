/**
 * Cadastro dos produtos reais da loja via API existente (POST /api/products).
 *
 * - Idempotente: usa upsert por slug/sku (nao cria duplicatas se rodar 2x).
 * - NAO envia costPrice (nao inventar custo de aquisicao).
 * - stock = 0 (nao inventar estoque; regra atual do schema).
 * - active = true (aparecem na vitrine).
 * - Precos sao PROVISORIOS de referencia.
 * - Nao cadastra imagens (ver scripts de imagem).
 *
 * Uso: node prisma/cadastro-produtos-loja.mjs
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const data = JSON.parse(readFileSync(join(__dirname, 'produtos-loja.json'), 'utf8'));

const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
const brands = await prisma.brand.findMany({ select: { id: true, slug: true } });

const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));
const brandBySlug = Object.fromEntries(brands.map((b) => [b.slug, b.id]));

const report = [];

for (const p of data.products) {
  const categoryId = catBySlug[p.categorySlug];
  if (!categoryId) {
    report.push({ n: p.n, name: p.name, status: 'ERRO', detail: `categoria ${p.categorySlug} nao encontrada` });
    continue;
  }

  let brandId = null;
  if (p.brandSlug) {
    brandId = brandBySlug[p.brandSlug] ?? null;
    if (!brandId) {
      report.push({ n: p.n, name: p.name, status: 'ERRO', detail: `marca ${p.brandSlug} nao encontrada` });
      continue;
    }
  }

  // Nunca sobrescreve preco/estoque de um produto que ja exista com este slug/sku.
  const existing = await prisma.product.findFirst({
    where: { OR: [{ slug: p.slug }, { sku: p.sku }] },
    select: { id: true, slug: true, sku: true },
  });

  const payload = {
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    price: p.price,
    stock: 0,
    active: true,
    categoryId,
    brandId,
  };

  try {
    let row;
    if (existing) {
      row = await prisma.product.update({
        where: { id: existing.id },
        data: payload,
        select: { id: true, slug: true, price: true, active: true, stock: true },
      });
      report.push({ n: p.n, name: p.name, status: 'ATUALIZADO', slug: row.slug, id: row.id, brand: p.brandSlug ?? '-', category: p.categorySlug, model: p.model, price: p.price, confidence: p.confidence });
    } else {
      row = await prisma.product.create({
        data: payload,
        select: { id: true, slug: true, price: true, active: true, stock: true },
      });
      report.push({ n: p.n, name: p.name, status: 'CRIADO', slug: row.slug, id: row.id, brand: p.brandSlug ?? '-', category: p.categorySlug, model: p.model, price: p.price, confidence: p.confidence });
    }
  } catch (err) {
    report.push({ n: p.n, name: p.name, status: 'ERRO', detail: err.message });
  }
}

console.log(JSON.stringify(report, null, 1));
await prisma.$disconnect();
