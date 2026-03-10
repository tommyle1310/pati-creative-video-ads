/**
 * lib/db/prisma.ts — Project Antigravity
 * Prisma client singleton for Next.js (Prisma 7.x + Neon HTTP adapter)
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeonHttp } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('DATABASE_URL not set — Prisma client unavailable');
    return null;
  }

  try {
    const adapter = new PrismaNeonHttp(url, {});
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  } catch (err) {
    console.error('Failed to create Prisma client:', err);
    return null;
  }
}

export const prisma: PrismaClient | null =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

export function getPrisma(): PrismaClient | null {
  return prisma;
}
