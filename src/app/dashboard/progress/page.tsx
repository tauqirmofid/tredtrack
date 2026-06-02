"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { formatDuration } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";

interface Run {
  id: string;
  date: string;
  duration: number;
  distance: number;
  avgSpeed: number;
  calories?: number;
  source: string;
  notes?: string;
}

interface Stats {
  totalDistance: number;
  totalDuration: number;
  totalCalories: number;
  totalRuns: number;
  avgSpeed: number;
  streak: number;
  weekly: { date: string; distance: number; duration: number }[];
}

export default function ProgressPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [statsRes, runsRes] = await Promise.all([
      fetch("/api/stats"),
      fetch("/api/runs?limit=30"),
    ]);
    setStats(await statsRes.json());
    setRuns(await runsRes.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteRun(id: string) {
    if (!confirm("Delete this run?")) return;
    await fetch(`/api/runs?id=${id}`, { method: "DELETE" });
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: "#30d158" }} />
      </div>
    );
  }

  const speedData = runs.slice(0, 14).reverse().map((r) => ({
    date: format(new Date(r.date), "MM/dd"),
    speed: r.avgSpeed,
    distance: r.distance,
  }));

  return (
    <div className="px-4 pt-14 pb-4">
      <h1 className="text-2xl font-bold mb-6 fade-in-up" style={{ color: "#f5f5f7" }}>Progress</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 fade-in-up">
        <StatCard label="Total Runs" value={String(stats?.totalRuns ?? 0)} unit="sessions" color="#30d158" />
        <StatCard label="Total Distance" value={(stats?.totalDistance ?? 0).toFixed(1)} unit="km" color="#0a84ff" />
        <StatCard label="Total Time" value={formatDuration(stats?.totalDuration ?? 0)} unit="" color="#ff9f0a" />
        <StatCard label="Avg Speed" value={String(stats?.avgSpeed ?? 0)} unit="km/h" color="#bf5af2" />
      </div>

      {/* Weekly distance bar chart */}
      {stats?.weekly && stats.weekly.some(w => w.distance > 0) && (
        <div className="card p-4 mb-4 fade-in-up">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "#8e8e93" }}>This Week (km)</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={stats.weekly} barSize={20}>
              <XAxis dataKey="date" tick={{ fill: "#8e8e93", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 10, color: "#f5f5f7" }}
                formatter={(v) => [`${v} km`, "Distance"]}
              />
              <Bar dataKey="distance" fill="#30d158" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Speed trend */}
      {speedData.length > 1 && (
        <div className="card p-4 mb-4 fade-in-up">
          <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: "#8e8e93" }}>Speed Trend (km/h)</h3>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2e" />
              <XAxis dataKey="date" tick={{ fill: "#8e8e93", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8e8e93", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 10, color: "#f5f5f7" }}
                formatter={(v) => [`${v} km/h`, "Avg Speed"]}
              />
              <Line type="monotone" dataKey="speed" stroke="#0a84ff" strokeWidth={2.5} dot={{ r: 3, fill: "#0a84ff" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All Runs list */}
      {runs.length > 0 && (
        <div className="fade-in-up">
          <h3 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: "#8e8e93" }}>All Runs</h3>
          <div className="flex flex-col gap-2">
            {runs.map((run) => (
              <div key={run.id} className="card px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: "rgba(48,209,88,0.1)" }}>
                    🏃
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#f5f5f7" }}>
                      {run.distance.toFixed(2)} km · {formatDuration(run.duration)}
                    </p>
                    <p className="text-xs" style={{ color: "#8e8e93" }}>
                      {format(new Date(run.date), "EEE, MMM d, yyyy")}
                    </p>
                    {run.notes && <p className="text-xs mt-0.5" style={{ color: "#636366" }}>{run.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: "#30d158" }}>{run.avgSpeed} <span className="text-[11px] font-normal" style={{ color: "#8e8e93" }}>km/h</span></p>
                    <p className="text-[11px]" style={{ color: "#8e8e93" }}>{run.calories ? `${Math.round(run.calories)} kcal` : ""}</p>
                  </div>
                  <button onClick={() => deleteRun(run.id)} className="w-8 h-8 flex items-center justify-center rounded-lg active:scale-90 transition-transform"
                    style={{ color: "#ff453a", background: "rgba(255,69,58,0.1)" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <p className="font-semibold" style={{ color: "#f5f5f7" }}>No runs yet</p>
          <p className="text-sm mt-1" style={{ color: "#8e8e93" }}>Log your first run to see your progress</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#8e8e93" }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: "#f5f5f7" }}>
        {value}
        {unit && <span className="text-sm font-normal ml-1" style={{ color: "#8e8e93" }}>{unit}</span>}
      </p>
      <div className="mt-2 h-0.5 w-8 rounded-full" style={{ background: color }} />
    </div>
  );
}
