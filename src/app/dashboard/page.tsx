import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDuration, formatDistance } from "@/lib/utils";
import { Camera, Pencil, Flame, Zap, Route, Clock } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const recentRuns = await prisma.run.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
    take: 10,
  });

  const totalDistance = recentRuns.reduce((s: number, r) => s + r.distance, 0);
  const totalDuration = recentRuns.reduce((s: number, r) => s + r.duration, 0);
  const totalCalories = recentRuns.reduce((s: number, r) => s + (r.calories ?? 0), 0);

  // Today's run
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRuns = recentRuns.filter((r) => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });
  const todayDistance = todayRuns.reduce((s: number, r) => s + r.distance, 0);
  const todayDuration = todayRuns.reduce((s: number, r) => s + r.duration, 0);

  // Streak
  const allRuns = await prisma.run.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "asc" },
    select: { date: true },
  });
  const runDays = [...new Set(allRuns.map((r) => {
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

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="px-4 pt-14 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 fade-in-up">
        <div>
          <p className="text-sm" style={{ color: "#8e8e93" }}>{greeting()}</p>
          <h1 className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>
            {user?.name?.split(" ")[0] ?? "Runner"} 👋
          </h1>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(255,159,10,0.15)", border: "1px solid rgba(255,159,10,0.25)" }}>
            <Flame size={16} style={{ color: "#ff9f0a" }} />
            <span className="font-bold text-sm" style={{ color: "#ff9f0a" }}>{streak} day streak</span>
          </div>
        )}
      </div>

      {/* Today Card */}
      <div className="card p-5 mb-4 fade-in-up" style={{ animationDelay: "0.05s",
        background: todayRuns.length > 0
          ? "linear-gradient(135deg, #1a3a2a, #0f2a1a)"
          : "linear-gradient(135deg, #1c1c1e, #1a1a1c)",
        border: todayRuns.length > 0 ? "1px solid rgba(48,209,88,0.3)" : undefined }}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#30d158" }}>
              Today
            </p>
            <p className="text-lg font-semibold" style={{ color: "#f5f5f7" }}>
              {format(new Date(), "EEEE, MMM d")}
            </p>
          </div>
          {todayRuns.length > 0 && (
            <div className="px-2.5 py-1 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(48,209,88,0.2)", color: "#30d158" }}>
              ✓ Run logged
            </div>
          )}
        </div>

        {todayRuns.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "#8e8e93" }}>Distance</p>
              <p className="text-xl font-bold" style={{ color: "#f5f5f7" }}>{todayDistance.toFixed(2)} <span className="text-sm font-normal">km</span></p>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "#8e8e93" }}>Duration</p>
              <p className="text-xl font-bold" style={{ color: "#f5f5f7" }}>{formatDuration(todayDuration)}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#8e8e93" }}>No run logged yet today. Ready to go?</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
        <Link href="/dashboard/log?mode=camera" className="card p-4 flex flex-col gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #30d158, #25a244)" }}>
            <Camera size={20} color="white" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#f5f5f7" }}>Snap & Track</p>
            <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>Upload treadmill photo</p>
          </div>
        </Link>
        <Link href="/dashboard/log?mode=manual" className="card p-4 flex flex-col gap-3 active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #0a84ff, #0060dd)" }}>
            <Pencil size={20} color="white" />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#f5f5f7" }}>Manual Entry</p>
            <p className="text-xs mt-0.5" style={{ color: "#8e8e93" }}>Enter time & distance</p>
          </div>
        </Link>
      </div>

      {/* All-time Stats */}
      <div className="card p-5 mb-6 fade-in-up" style={{ animationDelay: "0.15s" }}>
        <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "#8e8e93" }}>All-time Stats</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatItem icon={<Route size={16} />} value={formatDistance(totalDistance)} label="Total Dist." color="#30d158" />
          <StatItem icon={<Clock size={16} />} value={formatDuration(totalDuration)} label="Total Time" color="#0a84ff" />
          <StatItem icon={<Zap size={16} />} value={`${Math.round(totalCalories)}`} label="Calories" color="#ff9f0a" />
        </div>
      </div>

      {/* Recent Runs */}
      {recentRuns.length > 0 && (
        <div className="fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#8e8e93" }}>Recent Runs</h3>
          <div className="flex flex-col gap-2">
            {recentRuns.slice(0, 5).map((run) => (
              <div key={run.id} className="card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: "rgba(48,209,88,0.12)" }}>
                    🏃
                  </div>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "#f5f5f7" }}>
                      {run.distance.toFixed(2)} km
                    </p>
                    <p className="text-xs" style={{ color: "#8e8e93" }}>
                      {format(new Date(run.date), "MMM d")} · {formatDuration(run.duration)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold" style={{ color: "#30d158" }}>{run.avgSpeed} <span className="text-xs font-normal" style={{ color: "#8e8e93" }}>km/h</span></p>
                  {run.source === "image" && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: "rgba(10,132,255,0.15)", color: "#0a84ff" }}>📷 photo</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentRuns.length === 0 && (
        <div className="text-center py-12 fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-5xl mb-4">🏃‍♂️</div>
          <p className="font-semibold mb-2" style={{ color: "#f5f5f7" }}>Log your first run!</p>
          <p className="text-sm" style={{ color: "#8e8e93" }}>Take a photo of your treadmill or enter data manually</p>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <p className="text-base font-bold" style={{ color: "#f5f5f7" }}>{value}</p>
      <p className="text-[11px]" style={{ color: "#8e8e93" }}>{label}</p>
    </div>
  );
}
