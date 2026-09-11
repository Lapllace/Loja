/**
 * Seed de teste da vitrine (idempotente).
 * Cria categorias, marcas, produtos e imagens de exemplo para validação local.
 * Uso: node prisma/seed-vitrine.mjs
 * Pode ser removido quando existir um cadastro administrativo real.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMG = 'http://localhost:3001/images/products';

const categories = [
  { slug: 'acessorios-para-celular', name: 'Acessórios para Celular', description: 'Capas, películas, carregadores e mais para o seu celular.' },
  { slug: 'fones-de-ouvido', name: 'Fones de Ouvido', description: 'Fones Bluetooth e com fio para o dia a dia.' },
  { slug: 'caixas-de-som', name: 'Caixas de Som', description: 'Potência e qualidade de som para qualquer ambiente.' },
  { slug: 'smartwatches', name: 'Smartwatches', description: 'Relógios inteligentes com GPS e monitoramento.' },
  { slug: 'garrafas-termicas', name: 'Garrafas Térmicas', description: 'Mantenha sua bebida na temperatura ideal por horas.' },
  { slug: 'perfumes-arabes', name: 'Perfumes Árabes', description: 'Fragrâncias importadas de longa fixação.' },
  { slug: 'presentes', name: 'Presentes', description: 'Presentes importados para todas as ocasiões.' },
];

const brands = [
  { slug: 'gil-imports', name: 'Gil Imports', description: 'Produtos importados selecionados pela Gil Imports.' },
  { slug: 'importados-premium', name: 'Importados Premium', description: 'Linha premium de produtos importados.' },
];

const products = [
  {
    sku: 'GIL-FON-001',
    name: 'Fone Bluetooth In-Ear Premium',
    slug: 'fone-bluetooth-in-ear-premium',
    description: 'Fone de ouvido Bluetooth com cancelamento de ruído, bateria de longa duração e estojo de carregamento.',
    shortDescription: 'Cancelamento de ruído e bateria de longa duração.',
    price: '129.90',
    comparePrice: '159.90',
    stock: 12,
    featured: true,
    images: [{ url: `${IMG}/fone.svg`, alt: 'Fone Bluetooth In-Ear Premium', position: 0 }],
  },
  {
    sku: 'GIL-CAIX-001',
    name: 'Caixa de Som Portátil Bluetooth',
    slug: 'caixa-de-som-portatil-bluetooth',
    description: 'Caixa de som portátil com conexão Bluetooth, resistência à água e até 12 horas de reprodução.',
    shortDescription: 'Som potente, portátil e resistente à água.',
    price: '199.90',
    comparePrice: null,
    stock: 8,
    featured: true,
    images: [{ url: `${IMG}/caixa.svg`, alt: 'Caixa de Som Portátil Bluetooth', position: 0 }],
  },
  {
    sku: 'GIL-SMAR-001',
    name: 'Smartwatch Esportivo com GPS',
    slug: 'smartwatch-esportivo-com-gps',
    description: 'Relógio inteligente com GPS integrado, monitor de frequência cardíaca e tela AMOLED.',
    shortDescription: 'GPS integrado e monitoramento completo.',
    price: '349.90',
    comparePrice: '429.90',
    stock: 5,
    featured: true,
    images: [
      { url: `${IMG}/smartwatch.svg`, alt: 'Smartwatch Esportivo com GPS', position: 0 },
      { url: `${IMG}/produto.svg`, alt: 'Smartwatch detalhe', position: 1 },
    ],
  },
  {
    sku: 'GIL-GARR-001',
    name: 'Garrafa Térmica Inox 750ml',
    slug: 'garrafa-termica-inox-750ml',
    description: 'Garrafa térmica de aço inox com isolamento a vácuo, mantém bebidas quentes por 12h e frias por 24h.',
    shortDescription: 'Aço inox, 12h quente / 24h fria.',
    price: '189.90',
    comparePrice: null,
    stock: 20,
    featured: false,
    images: [{ url: `${IMG}/garrafa.svg`, alt: 'Garrafa Térmica Inox 750ml', position: 0 }],
  },
  {
    sku: 'GIL-PERF-001',
    name: 'Perfume Árabe Oud Royal 100ml',
    slug: 'perfume-arabe-oud-royal-100ml',
    description: 'Eau de parfum árabe com notas de oud, âmbar e especiarias. Longa fixação.',
    shortDescription: 'Fragrância intensa de longa fixação.',
    price: '249.90',
    comparePrice: '299.90',
    stock: 10,
    featured: true,
    images: [{ url: `${IMG}/perfume.svg`, alt: 'Perfume Árabe Oud Royal 100ml', position: 0 }],
  },
  {
    sku: 'GIL-CARR-001',
    name: 'Carregador Rápido USB-C 30W',
    slug: 'carregador-rapido-usb-c-30w',
    description: 'Carregador rápido com saída USB-C Power Delivery de 30W, compatível com celulares e tablets.',
    shortDescription: 'Carga rápida 30W Power Delivery.',
    price: '89.90',
    comparePrice: null,
    stock: 30,
    featured: false,
    images: [{ url: `${IMG}/carregador.svg`, alt: 'Carregador Rápido USB-C 30W', position: 0 }],
  },
  {
    sku: 'GIL-PELI-001',
    name: 'Película de Vidro Temperado Universal',
    slug: 'pelicula-de-vidro-temperado-universal',
    description: 'Película de vidro temperado 9H com alta transparência. Produto sem imagem cadastrada (cenário de teste).',
    shortDescription: 'Vidro temperado 9H.',
    price: '19.90',
    comparePrice: null,
    stock: 50,
    featured: false,
    images: [],
  },
  {
    sku: 'GIL-POWE-001',
    name: 'Power Bank 10000mAh',
    slug: 'power-bank-10000mah',
    description: 'Bateria portátil de 10000mAh com duas saídas USB e entrada USB-C. Produto esgotado (cenário de teste).',
    shortDescription: 'Bateria portátil 10000mAh.',
    price: '119.90',
    comparePrice: '149.90',
    stock: 0,
    featured: false,
    images: [{ url: `${IMG}/powerbank.svg`, alt: 'Power Bank 10000mAh', position: 0 }],
  },
  {
    sku: 'GIL-INAT-001',
    name: 'Produto Inativo (Teste)',
    slug: 'produto-inativo-teste',
    description: 'Produto inativo não deve aparecer na vitrine pública.',
    shortDescription: 'Não exibir.',
    price: '10.00',
    comparePrice: null,
    stock: 100,
    active: false,
    featured: false,
    images: [],
  },
];

async function main() {
  const catBySlug = {};
  for (const c of categories) {
    catBySlug[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, active: true },
      create: { ...c, active: true },
    });
  }

  const brandBySlug = {};
  for (const b of brands) {
    brandBySlug[b.slug] = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { name: b.name, description: b.description, active: true },
      create: { ...b, active: true },
    });
  }

  const catByProduct = {
    'fone-bluetooth-in-ear-premium': 'fones-de-ouvido',
    'caixa-de-som-portatil-bluetooth': 'caixas-de-som',
    'smartwatch-esportivo-com-gps': 'smartwatches',
    'garrafa-termica-inox-750ml': 'garrafas-termicas',
    'perfume-arabe-oud-royal-100ml': 'perfumes-arabes',
    'carregador-rapido-usb-c-30w': 'acessorios-para-celular',
    'pelicula-de-vidro-temperado-universal': 'acessorios-para-celular',
    'power-bank-10000mah': 'acessorios-para-celular',
    'produto-inativo-teste': 'acessorios-para-celular',
  };

  for (const p of products) {
    const { images, ...data } = p;
    const catSlug = catByProduct[p.slug] ?? 'acessorios-para-celular';
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...data, active: p.active ?? true, categoryId: catBySlug[catSlug].id },
      create: {
        ...data,
        active: p.active ?? true,
        categoryId: catBySlug[catSlug].id,
        brandId: brandBySlug['gil-imports'].id,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const img of images) {
      await prisma.productImage.create({
        data: { ...img, productId: product.id },
      });
    }
  }

  console.log('Seed da vitrine concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
