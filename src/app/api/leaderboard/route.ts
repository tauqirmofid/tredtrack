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

  const leaderboard = users
    .map((u) => {
      const totalDistance = Math.round(u.runs.reduce((s, r) => s + r.distance, 0) * 100) / 100;
      const totalRuns = u.runs.length;
      const avgSpeed =
        totalRuns > 0
          ? Math.round((u.runs.reduce((s, r) => s + r.avgSpeed, 0) / totalRuns) * 10) / 10
          : 0;
      const lastRun = u.runs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
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
