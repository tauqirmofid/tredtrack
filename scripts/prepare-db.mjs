import "dotenv/config";
import { execSync } from "node:child_process";
import { createClient } from "@libsql/client";

function run(command) {
  execSync(command, { stdio: "inherit" });
}

async function ensureRemoteLibsqlSchema(rawUrl) {
  let url = rawUrl;
  let authToken = process.env.TURSO_AUTH_TOKEN;

  try {
    const parsed = new URL(rawUrl);
    const tokenFromUrl = parsed.searchParams.get("authToken");
    if (tokenFromUrl) authToken = tokenFromUrl;
    parsed.searchParams.delete("authToken");
    url = parsed.toString();
  } catch {
    // keep raw URL as-is
  }

  const client = createClient({ url, authToken });

  const statements = [
    'ALTER TABLE "User" ADD COLUMN "heightCm" REAL',
    'ALTER TABLE "User" ADD COLUMN "weightKg" REAL',
    'ALTER TABLE "User" ADD COLUMN "dumbbellWeightKg" REAL',
    'ALTER TABLE "User" ADD COLUMN "barbellWeightKg" REAL',
    `CREATE TABLE IF NOT EXISTS "StrengthLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "equipment" TEXT NOT NULL,
      "exercise" TEXT NOT NULL,
      "weightKg" REAL NOT NULL,
      "sets" INTEGER NOT NULL,
      "reps" INTEGER NOT NULL,
      "durationMinutes" INTEGER,
      "volumeKg" REAL NOT NULL,
      "calories" REAL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS "StrengthLog_userId_date_idx" ON "StrengthLog"("userId", "date")',
    `CREATE TABLE IF NOT EXISTS "WeightLog" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "userId" TEXT NOT NULL,
      "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "weightKg" REAL NOT NULL,
      "source" TEXT NOT NULL DEFAULT 'manual',
      "note" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    )`,
    'CREATE INDEX IF NOT EXISTS "WeightLog_userId_date_idx" ON "WeightLog"("userId", "date")',
  ];

  for (const sql of statements) {
    try {
      await client.execute(sql);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (
        message.includes("duplicate column") ||
        message.includes("already exists") ||
        message.includes("duplicate")
      ) {
        continue;
      }
      throw error;
    }
  }

  await client.close();
}

async function main() {
  const raw = (process.env.DATABASE_URL || "").trim();
  const databaseUrl = raw.startsWith("\"") && raw.endsWith("\"") ? raw.slice(1, -1) : raw;

  if (!databaseUrl || databaseUrl.startsWith("file:")) {
    run("npx prisma db push");
    return;
  }

  if (databaseUrl.startsWith("libsql:") || databaseUrl.startsWith("https:")) {
    await ensureRemoteLibsqlSchema(databaseUrl);
    return;
  }

  throw new Error("Unsupported DATABASE_URL scheme for build preparation");
}

main().catch((error) => {
  console.error("DB prepare failed:", error);
  process.exit(1);
});
