import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    include: {
      runs: { select: { distance: true, duration: true, avgSpeed: true, date: true } },
    },
  });

  type RunEntry = { distance: number; duration: number; avgSpeed: number; date: Date };
  type UserWithRuns = (typeof users)[number];

  const leaderboard = users
    .map((u: UserWithRuns) => {
      const runs = u.runs as RunEntry[];
      const totalDistance = Math.round(runs.reduce((s: number, r: RunEntry) => s + r.distance, 0) * 100) / 100;
      const totalRuns = runs.length;
      const avgSpeed =
        totalRuns > 0
          ? Math.round((runs.reduce((s: number, r: RunEntry) => s + r.avgSpeed, 0) / totalRuns) * 10) / 10
          : 0;
      const lastRun = [...runs].sort((a: RunEntry, b: RunEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return {
        id: u.id,
        name: u.name,
        username: u.username,
        totalDistance,
        totalRuns,
        avgSpeed,
        lastRunDate: lastRun?.date ?? null,
        isCurrentUser: u.id === session?.user?.id,
      };
    })
    .filter((u) => u.totalRuns > 0)
    .sort((a, b) => b.totalDistance - a.totalDistance)
    .slice(0, 100);

  return NextResponse.json(leaderboard);
}
