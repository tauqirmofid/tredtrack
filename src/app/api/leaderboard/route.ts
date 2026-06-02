import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RunEntry = { distance: number; duration: number; avgSpeed: number; date: Date };
type LeaderboardEntry = {
  id: string;
  name: string | null;
  username: string;
  totalDistance: number;
  totalRuns: number;
  avgSpeed: number;
  lastRunDate: Date | null;
  isCurrentUser: boolean;
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    include: {
      runs: { select: { distance: true, duration: true, avgSpeed: true, date: true } },
    },
  });

  const leaderboard: LeaderboardEntry[] = [];

  for (const u of users) {
    const runs = u.runs as RunEntry[];
    const totalRuns = runs.length;
    if (totalRuns === 0) continue;

    const totalDistance = Math.round(runs.reduce((s: number, r: RunEntry) => s + r.distance, 0) * 100) / 100;
    const avgSpeed = Math.round((runs.reduce((s: number, r: RunEntry) => s + r.avgSpeed, 0) / totalRuns) * 10) / 10;
    const lastRun = [...runs].sort((a: RunEntry, b: RunEntry) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    leaderboard.push({
      id: u.id,
      name: u.name,
      username: u.username,
      totalDistance,
      totalRuns,
      avgSpeed,
      lastRunDate: lastRun?.date ?? null,
      isCurrentUser: u.id === session?.user?.id,
    });
  }

  leaderboard.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.totalDistance - a.totalDistance);

  return NextResponse.json(leaderboard.slice(0, 100));
}
