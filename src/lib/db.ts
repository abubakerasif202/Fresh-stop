import { PrismaClient } from "@prisma/client";
import { runtimeDatabaseUrl } from "./db-url";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const runtimeUrl = runtimeDatabaseUrl(process.env.DATABASE_URL);
const clientOptions = runtimeUrl ? { datasources: { db: { url: runtimeUrl } } } : undefined;

export const db = globalForPrisma.prisma ?? new PrismaClient(clientOptions);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
