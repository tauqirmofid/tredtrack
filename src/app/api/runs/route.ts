import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcAvgSpeed, calcCalories } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const runs = await prisma.run.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: limit,
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { duration, distance, date, notes, imageUrl, source, maxSpeed } = await req.json();
  if (!duration || !distance || isNaN(Number(duration)) || isNaN(Number(distance)) || Number(duration) <= 0 || Number(distance) <= 0) {
    return NextResponse.json({ error: "Valid duration and distance required" }, { status: 400 });
  }

  const avgSpeed = calcAvgSpeed(distance, duration);
  const calories = calcCalories(distance);

  const run = await prisma.run.create({
    data: {
      userId: session.user.id,
      duration: Number(duration),
      distance: Number(distance),
      avgSpeed,
      maxSpeed: maxSpeed ? Number(maxSpeed) : null,
      calories,
      date: date ? new Date(date) : new Date(),
      notes: notes ?? null,
      imageUrl: imageUrl ?? null,
      source: source ?? "manual",
    },
  });
  return NextResponse.json(run);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await prisma.run.deleteMany({ where: { id, userId: session.user.id } });
  return NextResponse.json({ success: true });
}
