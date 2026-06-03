import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const user = await prismaAny.user.findUnique({
      where: { id: session.user.id },
      select: {
        heightCm: true,
        weightKg: true,
        dumbbellWeightKg: true,
        barbellWeightKg: true,
        name: true,
        weightLogs: {
          orderBy: { date: "desc" },
          take: 30,
          select: {
            id: true,
            date: true,
            weightKg: true,
            source: true,
          },
        },
      },
    });

    return NextResponse.json(user ?? {
      heightCm: null,
      weightKg: null,
      dumbbellWeightKg: null,
      barbellWeightKg: null,
      name: null,
      weightLogs: [],
    });
  } catch {
    return NextResponse.json({
      heightCm: null,
      weightKg: null,
      dumbbellWeightKg: null,
      barbellWeightKg: null,
      name: null,
      weightLogs: [],
    });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    heightCm?: number | null;
    weightKg?: number | null;
    dumbbellWeightKg?: number | null;
    barbellWeightKg?: number | null;
  };

  const toNullableNumber = (value: unknown) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 500) return "INVALID";
    return n;
  };

  const heightCm = toNullableNumber(body.heightCm);
  const weightKg = toNullableNumber(body.weightKg);
  const dumbbellWeightKg = toNullableNumber(body.dumbbellWeightKg);
  const barbellWeightKg = toNullableNumber(body.barbellWeightKg);

  if ([heightCm, weightKg, dumbbellWeightKg, barbellWeightKg].includes("INVALID")) {
    return NextResponse.json({ error: "Invalid weight value" }, { status: 400 });
  }

  const data: { heightCm?: number | null; weightKg?: number | null; dumbbellWeightKg?: number | null; barbellWeightKg?: number | null } = {};
  if (heightCm !== undefined) data.heightCm = heightCm as number | null;
  if (weightKg !== undefined) data.weightKg = weightKg as number | null;
  if (dumbbellWeightKg !== undefined) data.dumbbellWeightKg = dumbbellWeightKg as number | null;
  if (barbellWeightKg !== undefined) data.barbellWeightKg = barbellWeightKg as number | null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const existingUser = await prismaAny.user.findUnique({
      where: { id: session.user.id },
      select: { weightKg: true },
    });

    const user = await prismaAny.user.update({
      where: { id: session.user.id },
      data,
      select: {
        heightCm: true,
        weightKg: true,
        dumbbellWeightKg: true,
        barbellWeightKg: true,
      },
    });

    if (weightKg !== undefined && weightKg !== null) {
      const previousWeight = existingUser?.weightKg ?? null;
      if (previousWeight === null || Math.abs(Number(weightKg) - Number(previousWeight)) >= 0.05) {
        try {
          await prismaAny.weightLog.create({
            data: {
              userId: session.user.id,
              weightKg: Number(weightKg),
              source: "manual",
            },
          });
        } catch {
          // non-fatal
        }
      }
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({
      error: "Profile weight fields are not available yet. Please redeploy and retry.",
      heightCm: null,
      weightKg: null,
      dumbbellWeightKg: null,
      barbellWeightKg: null,
    }, { status: 503 });
  }
}
