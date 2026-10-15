import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Vercel demo mode: serverless filesystems are read-only, so the bundled
 * read-only snapshot (prisma/demo.db) is copied to /tmp and opened from there.
 * Data written there is ephemeral; ordering is disabled via DEMO_READ_ONLY.
 */
function createClient(): PrismaClient {
  if (process.env.VERCEL) {
    const bundled = path.join(process.cwd(), "prisma", "demo.db");
    const target = "/tmp/fresh-stop-demo.db";
    if (!existsSync(target) && existsSync(bundled)) copyFileSync(bundled, target);
    return new PrismaClient({ datasourceUrl: `file:${target}` });
  }
  return new PrismaClient();
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
