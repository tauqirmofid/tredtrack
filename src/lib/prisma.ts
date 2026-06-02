import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";

  // Local SQLite — no adapter needed
  if (rawUrl.startsWith("file:")) {
    return new PrismaClient();
  }

  // Turso / libsql — split url and authToken if embedded as query param
  let url = rawUrl;
  let authToken: string | undefined;
  try {
    const parsed = new URL(rawUrl);
    authToken = parsed.searchParams.get("authToken") ?? undefined;
    parsed.searchParams.delete("authToken");
    url = parsed.toString();
  } catch {
    // not a valid URL, use as-is
  }

  const adapter = new PrismaLibSql({ url, authToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
