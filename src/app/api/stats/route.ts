import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const runs = await prisma.run.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
  });

  const totalDistance = runs.reduce((sum, r) => sum + r.distance, 0);
  const totalDuration = runs.reduce((sum, r) => sum + r.duration, 0);
  const totalCalories = runs.reduce((sum, r) => sum + (r.calories ?? 0), 0);
  const totalRuns = runs.length;
  const avgSpeed = totalDuration > 0 ? totalDistance / (totalDuration / 3600) : 0;

  // Streak calc
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runDays = [...new Set(runs.map((r) => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))].sort((a, b) => b - a);

  let streak = 0;
  let check = today.getTime();
  for (const day of runDays) {
    if (day === check || day === check - 86400000) {
      streak++;
      check = day - 86400000;
    } else break;
  }

  // Weekly data (last 7 days)
  const weekly: { date: string; distance: number; duration: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dayRuns = runs.filter((r) => {
      const rd = new Date(r.date);
      rd.setHours(0, 0, 0, 0);
      return rd.getTime() === d.getTime();
    });
    weekly.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      distance: Math.round(dayRuns.reduce((s, r) => s + r.distance, 0) * 100) / 100,
      duration: dayRuns.reduce((s, r) => s + r.duration, 0),
    });
  }

  return NextResponse.json({
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration,
    totalCalories: Math.round(totalCalories),
    totalRuns,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    streak,
    weekly,
  });
}
