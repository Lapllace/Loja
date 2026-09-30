const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const col = await prisma.$queryRawUnsafe(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='Order' AND column_name='shippingOptionName'",
    );
    console.log('COLUMN:', JSON.stringify(col));
    const migs = await prisma.$queryRawUnsafe(
      'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 8',
    );
    console.log('MIGS:', JSON.stringify(migs.map((m) => m.migration_name)));
  } catch (e) {
    console.log('DBQ_ERROR:', e.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
})();
