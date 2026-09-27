 import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const brands = await prisma.brand.findMany({
  select: { id: true, name: true, slug: true, active: true },
  take: 15,
});

const total = await prisma.brand.count();

console.log('total brands: ' + total);
console.log(JSON.stringify(brands, null, 1));

await prisma.$disconnect();
