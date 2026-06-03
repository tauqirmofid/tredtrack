import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALID_EQUIPMENT = new Set(["dumbbell", "barbell"]);

function estimateStrengthCalories(durationMinutes: number, bodyWeightKg = 70) {
  const met = 5.5;
  return Math.round((met * 3.5 * bodyWeightKg / 200) * durationMinutes);
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const logs = await prismaAny.strengthLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    });

    return NextResponse.json(logs);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    equipment?: string;
    exercise?: string;
    weightKg?: number;
    sets?: number;
    reps?: number;
    durationMinutes?: number;
    date?: string;
    notes?: string;
  };

  const equipment = String(body.equipment ?? "").toLowerCase();
  const exercise = String(body.exercise ?? "").trim();
  const weightKg = Number(body.weightKg);
  const sets = Number(body.sets);
  const reps = Number(body.reps);
  const durationMinutes = body.durationMinutes === undefined || body.durationMinutes === null
    ? null
    : Number(body.durationMinutes);

  if (!VALID_EQUIPMENT.has(equipment)) {
    return NextResponse.json({ error: "Equipment must be dumbbell or barbell" }, { status: 400 });
  }
  if (!exercise) return NextResponse.json({ error: "Exercise name is required" }, { status: 400 });
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
    return NextResponse.json({ error: "Valid weight is required" }, { status: 400 });
  }
  if (!Number.isInteger(sets) || sets < 1 || sets > 100 || !Number.isInteger(reps) || reps < 1 || reps > 500) {
    return NextResponse.json({ error: "Valid sets and reps are required" }, { status: 400 });
  }
  if (durationMinutes !== null && (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 360)) {
    return NextResponse.json({ error: "Duration must be between 1 and 360 minutes" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    const user = await prismaAny.user.findUnique({ where: { id: session.user.id }, select: { weightKg: true } });
    const volumeKg = Number((weightKg * sets * reps).toFixed(2));
    const calories = durationMinutes !== null ? estimateStrengthCalories(durationMinutes, user?.weightKg ?? 70) : null;

    const log = await prismaAny.strengthLog.create({
      data: {
        userId: session.user.id,
        equipment,
        exercise,
        weightKg,
        sets,
        reps,
        durationMinutes,
        volumeKg,
        calories,
        date: body.date ? new Date(body.date) : new Date(),
        notes: body.notes?.trim() ? body.notes.trim() : null,
      },
    });

    return NextResponse.json(log);
  } catch {
    return NextResponse.json({ error: "Strength logging is temporarily unavailable" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    await prismaAny.strengthLog.deleteMany({ where: { id, userId: session.user.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
