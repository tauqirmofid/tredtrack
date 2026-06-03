import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  const envUrl = process.env.DATABASE_URL?.trim();
  const rawUrl = envUrl && envUrl.length > 0 ? envUrl : "file:./prisma/dev.db";

  // Local SQLite via file URL
  if (rawUrl.startsWith("file:")) {
    const adapter = new PrismaLibSql({ url: rawUrl });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
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

  if (!url || !url.trim()) {
    const adapter = new PrismaLibSql({ url: "file:./prisma/dev.db" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  const adapter = new PrismaLibSql({ url, authToken });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
