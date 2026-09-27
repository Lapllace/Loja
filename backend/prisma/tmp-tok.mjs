import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';

const envRaw = readFileSync('.env', 'utf8');
const line = envRaw.split(/\r?\n/).find((l) => l.trim().startsWith('JWT_SECRET='));
const secret = line
  .replace('JWT_SECRET=', '')
  .split('"')
  .join('')
  .split("'")
  .join('')
  .trim();

const prisma = new PrismaClient();

const u = await prisma.user.findUnique({
  where: { email: 'alisonbcet@gmail.com' },
  select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
});

const token = jwt.sign({ sub: u.id, email: u.email, role: u.role }, secret, {
  expiresIn: '2h',
});

console.log(JSON.stringify({ user: u, token, accessToken: token }));
await prisma.$disconnect();
