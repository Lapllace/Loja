import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const all = await prisma.product.findMany({
  // QUERY_BLOCK_START
  select: {
    sku: true, slug: true, name: true, price: true, active: true, stock: true, costPrice: true, brand: { select: { name: true } }, category: { select: { slug: true } },
    orderBy: { createdAt: 'asc' },
  });

console.log('TOTAL PRODUCTS=' + all.length);
console.log('WITH COSTPRICE=' + all.filter((p) => p.costPrice !== null).length);
console.log('ACTIVE=' + all.filter((p) => p.active).length);
console.log('STOCK_NONZERO=' + all.filter((p) => p.stock !== 0).length);

const slugs = all.map((p) => p.slug);
const dupeSlugs = slugs.filter((s, i) => slugs.indexOf(s) !== i);
const skus = all.map((p) => p.sku);
const dupeSkus = skus.filter((s, i) => skus.indexOf(s) !== i);
console.log('DUPE_SLUGS=' + JSON.stringify(dupeSlugs));
console.log('DUPE_SKUS=' + JSON.stringify(dupeSkus));

console.log('---NOVOS---');
for (const p of all.filter((x) => x.sku.startsWith('GIL-') && !['GIL-FON-001', 'GIL-CAIX-001', 'GIL-SMAR-001', 'GIL-GARR-001', 'GIL-PERF-001', 'GIL-CARR-001', 'GIL-PELI-001', 'GIL-POWE-001', 'GIL-INAT-001', 'GIL-CARR-018', 'GIL-CARR-040', 'GIL-ARMA-032', 'GIL-ARMA-016', 'GIL-RAST-006', 'GIL-RAST-006F', 'GIL-AUDI-826', 'GIL-SUPO-031', 'GIL-CABO-156', 'GIL-CARR-0404', 'GIL-AUDI-027', 'GIL-CARR-GAN25', 'GIL-ACES-BTE20', 'GIL-ACES-BTE48A', 'GIL-AUDI-AM55', 'GIL-ACES-MAG5', 'GIL-ACES-BTE078', 'GIL-SMAR-S11M', 'GIL-SMAR-S11', 'GIL-SMAR-HWUM', 'GIL-SMAR-U9', 'GIL-SMAR-XBO9U', 'GIL-SMAR-W4', 'GIL-SMAR-WU4', 'GIL-SMAR-PULS'].includes(x.sku))) {
  console.log('UNEXPECTED: ' + p.sku + ' / ' + p.slug);
}
for (const p of all.filter((x) => !['GIL-FON-001', 'GIL-CAIX-001', 'GIL-SMAR-001', 'GIL-GARR-001', 'GIL-PERF-001', 'GIL-CARR-001', 'GIL-PELI-001', 'GIL-POWE-001', 'GIL-INAT-001'].includes(x.sku))) {
  console.log([p.sku, p.slug, p.name, p.price.toString(), p.active, p.stock, p.costPrice, p.brand?.name ?? '-', p.category.slug].join(' | '));
}

await prisma.$disconnect();
