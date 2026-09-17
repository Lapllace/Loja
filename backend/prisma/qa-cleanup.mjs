import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const user = await prisma.user.findUnique({ where: { email: 'qa.carrinho@local.test' } });

if (user) {
  const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
  if (cart) {
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.delete({ where: { id: cart.id } });
  }
  await prisma.user.delete({ where: { id: user.id } });
  console.log('usuario QA do carrinho removido (com carrinho e item)');
}

const qaLeft = await prisma.user.count({ where: { email: 'qa.carrinho@local.test' } });
const carts = await prisma.cartItem.count();
const products = await prisma.product.count();
const categories = await prisma.category.count();
const brands = await prisma.brand.count();

console.log('qa_user_restante=' + qaLeft);
console.log('cartItems_restantes=' + carts);
console.log('products=' + products);
console.log('categories=' + categories);
console.log('brands=' + brands);

await prisma.$disconnect();
