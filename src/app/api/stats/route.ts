import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Run = {
  distance: number;
  duration: number;
  calories: number | null;
  date: Date;
};

type StrengthLog = {
  sets: number;
  reps: number;
  volumeKg: number;
  calories: number | null;
  durationMinutes: number | null;
  date: Date;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let runs: Run[] = [];
  try {
    runs = await prisma.run.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
    });
  } catch {
    runs = [];
  }

  let strengthLogs: StrengthLog[] = [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaAny = prisma as any;
    strengthLogs = await prismaAny.strengthLog.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "asc" },
      select: {
        sets: true,
        reps: true,
        volumeKg: true,
        calories: true,
        durationMinutes: true,
        date: true,
      },
    });
  } catch {
    strengthLogs = [];
  }

  const totalDistance = runs.reduce((sum: number, r: Run) => sum + r.distance, 0);
  const runDuration = runs.reduce((sum: number, r: Run) => sum + r.duration, 0);
  const strengthDuration = strengthLogs.reduce((sum: number, s: StrengthLog) => {
    if (s.durationMinutes && s.durationMinutes > 0) return sum + s.durationMinutes * 60;
    return sum + Math.round(Math.max(10, s.sets * 2.5) * 60);
  }, 0);
  const totalDuration = runDuration + strengthDuration;
  const totalCalories = runs.reduce((sum: number, r: Run) => sum + (r.calories ?? 0), 0)
    + strengthLogs.reduce((sum: number, s: StrengthLog) => sum + (s.calories ?? 0), 0);
  const totalRuns = runs.length;
  const avgSpeed = totalDuration > 0 ? totalDistance / (totalDuration / 3600) : 0;
  const totalStrengthSessions = strengthLogs.length;
  const totalStrengthVolume = strengthLogs.reduce((sum: number, s: StrengthLog) => sum + s.volumeKg, 0);

  // Streak calc
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const runDays = [...new Set(runs.map((r: Run) => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }))].sort((a: number, b: number) => b - a);

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
    const dayRuns = runs.filter((r: Run) => {
      const rd = new Date(r.date);
      rd.setHours(0, 0, 0, 0);
      return rd.getTime() === d.getTime();
    });
    const dayStrength = strengthLogs.filter((s: StrengthLog) => {
      const sd = new Date(s.date);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === d.getTime();
    });
    const dayStrengthDuration = dayStrength.reduce((sum: number, s: StrengthLog) => {
      if (s.durationMinutes && s.durationMinutes > 0) return sum + s.durationMinutes * 60;
      return sum + Math.round(Math.max(10, s.sets * 2.5) * 60);
    }, 0);
    weekly.push({
      date: d.toLocaleDateString("en-US", { weekday: "short" }),
      distance: Math.round(dayRuns.reduce((s: number, r: Run) => s + r.distance, 0) * 100) / 100,
      duration: dayRuns.reduce((s: number, r: Run) => s + r.duration, 0) + dayStrengthDuration,
    });
  }

  return NextResponse.json({
    totalDistance: Math.round(totalDistance * 100) / 100,
    totalDuration,
    totalCalories: Math.round(totalCalories),
    totalRuns,
    avgSpeed: Math.round(avgSpeed * 10) / 10,
    totalStrengthSessions,
    totalStrengthVolume: Math.round(totalStrengthVolume),
    streak,
    weekly,
  });
}
