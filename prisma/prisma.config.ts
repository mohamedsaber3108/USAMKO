import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://usamko@localhost:5432/usamko_dev?sslmode=disable',
    },
  },
});

export default prisma;