import { PrismaClient } from '@prisma/client';

const email = process.argv.find((arg) => arg.startsWith('--email='))?.slice('--email='.length) ?? process.argv[2];

if (!email) {
  console.error('Uso: node scripts/grant-developer.mjs seu@email.com');
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exitCode = 2;
  } else {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isDeveloper: true },
      select: { id: true, email: true, role: true, isDeveloper: true },
    });
    console.log(JSON.stringify(updated, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
