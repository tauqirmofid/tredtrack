import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      weightKg: true,
      dumbbellWeightKg: true,
      barbellWeightKg: true,
      name: true,
    },
  });

  return NextResponse.json(user ?? { weightKg: null, dumbbellWeightKg: null, barbellWeightKg: null, name: null });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
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

  const weightKg = toNullableNumber(body.weightKg);
  const dumbbellWeightKg = toNullableNumber(body.dumbbellWeightKg);
  const barbellWeightKg = toNullableNumber(body.barbellWeightKg);

  if ([weightKg, dumbbellWeightKg, barbellWeightKg].includes("INVALID")) {
    return NextResponse.json({ error: "Invalid weight value" }, { status: 400 });
  }

  const data: { weightKg?: number | null; dumbbellWeightKg?: number | null; barbellWeightKg?: number | null } = {};
  if (weightKg !== undefined) data.weightKg = weightKg as number | null;
  if (dumbbellWeightKg !== undefined) data.dumbbellWeightKg = dumbbellWeightKg as number | null;
  if (barbellWeightKg !== undefined) data.barbellWeightKg = barbellWeightKg as number | null;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: {
      weightKg: true,
      dumbbellWeightKg: true,
      barbellWeightKg: true,
    },
  });

  return NextResponse.json(user);
}
